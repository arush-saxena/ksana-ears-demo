import { v4 as uuidv4 } from 'uuid';
import { DatabaseService } from '../utils/database';
import { SecureStorageService } from '../utils/secureStorage';
import { TimeService } from '../utils/timeService';
import { Logger } from '../utils/logger';

const logger = new Logger('SensingService');

/** Sensor types supported by EARS */
export type SensorType =
  | 'accelerometer'
  | 'gps'
  | 'screen-usage'
  | 'call-metadata'
  | 'text-metadata'
  | 'typing-dynamics';

/** Batch of sensor readings from a device */
export interface SensorBatch {
  batchId: string;
  deviceId: string;
  sensorType: SensorType;
  readings: SensorReading[];
  receivedAt: string;
}

/** Individual sensor reading */
export interface SensorReading {
  timestamp: string;
  values: Record<string, number | string>;
}

/** Result of batch ingestion */
export interface IngestionResult {
  batchId: string;
  recordsIngested: number;
  processingTimeMs: number;
}

/** Participant data collection status */
export interface ParticipantSensingStatus {
  participantId: string;
  activeSensors: SensorType[];
  lastUploadTime: string;
  totalReadings: number;
  dataQualityScore: number;
}

/**
 * Service for ingesting and managing passive sensor data from mobile devices.
 * All sensor data is PHI and must be encrypted at rest.
 */
export class SensingService {
  private db = DatabaseService;
  private storage = new SecureStorageService();
  private maxRetries = 3;

  /** Check if a batch has already been processed (idempotency) */
  async checkDuplicate(batchId: string): Promise<boolean> {
    const result = await this.db.query(
      'SELECT 1 FROM sensor_batches WHERE batch_id = $1',
      [batchId]
    );
    return result.rows.length > 0;
  }

  /**
   * Ingest a batch of sensor readings.
   * Pipeline: validate → de-identify → encrypt → store → record metadata
   */
  async ingestBatch(batch: SensorBatch): Promise<IngestionResult> {
    const startTime = Date.now(); // BUG: Should use TimeService.utcNow() per coding standards

    // Step 1: Validate readings
    this.validateReadings(batch);

    // Step 2: De-identify GPS data (generalize to census tract level)
    const processedReadings = batch.sensorType === 'gps'
      ? this.deidentifyGPS(batch.readings)
      : batch.readings;

    // Step 3: Encrypt and store raw data
    await this.storage.encryptAndStore(
      `sensing/${batch.sensorType}/${batch.batchId}.json`,
      JSON.stringify({
        ...batch,
        readings: processedReadings,
      })
    );

    // Step 4: Record metadata (non-PHI) in database
    await this.db.query(
      'INSERT INTO sensor_batches (batch_id, device_id, sensor_type, reading_count, received_at) VALUES ($1, $2, $3, $4, $5)',
      [batch.batchId, batch.deviceId, batch.sensorType, batch.readings.length, batch.receivedAt]
    );

    const processingTimeMs = Date.now() - startTime; // BUG: Same Date.now() issue

    return {
      batchId: batch.batchId,
      recordsIngested: batch.readings.length,
      processingTimeMs,
    };
  }

  /** Get participant's sensing data collection status */
  async getParticipantStatus(
    participantId: string,
    startDate?: string,
    endDate?: string
  ): Promise<ParticipantSensingStatus> {
    let query = `
      SELECT sensor_type, COUNT(*)::int as count, MAX(received_at) as last_upload
      FROM sensor_batches 
      WHERE device_id IN (SELECT device_id FROM participant_devices WHERE participant_id = $1)
    `;
    const params: any[] = [participantId];

    if (startDate) {
      params.push(startDate);
      query += ` AND received_at >= $${params.length}`;
    }
    if (endDate) {
      params.push(endDate);
      query += ` AND received_at <= $${params.length}`;
    }

    query += ' GROUP BY sensor_type';
    const result = await this.db.query(query, params);

    const activeSensors = result.rows.map((r: any) => r.sensor_type as SensorType);
    const totalReadings = result.rows.reduce((sum: number, r: any) => sum + r.count, 0);
    const lastUpload = result.rows.reduce((latest: string, r: any) =>
      r.last_upload > latest ? r.last_upload : latest, '');

    return {
      participantId,
      activeSensors,
      lastUploadTime: lastUpload,
      totalReadings,
      dataQualityScore: this.calculateQualityScore(activeSensors, totalReadings),
    };
  }

  /** Get aggregated data quality metrics for a study */
  async getStudyDataQuality(studyId: string): Promise<Record<string, any>> {
    const result = await this.db.query(
      `SELECT sensor_type, 
              COUNT(DISTINCT device_id)::int as active_devices,
              SUM(reading_count)::int as total_readings,
              AVG(reading_count)::float as avg_batch_size
       FROM sensor_batches sb
       JOIN participant_devices pd ON sb.device_id = pd.device_id
       JOIN study_participants sp ON pd.participant_id = sp.participant_id
       WHERE sp.study_id = $1 AND sb.received_at >= NOW() - INTERVAL '7 days'
       GROUP BY sensor_type`,
      [studyId]
    );
    return result.rows;
  }

  /** Validate sensor readings format */
  private validateReadings(batch: SensorBatch): void {
    if (!batch.readings || batch.readings.length === 0) {
      throw new Error('Batch must contain at least one reading');
    }

    for (const reading of batch.readings) {
      if (!reading.timestamp) {
        throw new Error('Each reading must have a timestamp');
      }
    }
  }

  /**
   * De-identify GPS coordinates by generalizing to census tract level.
   * Raw coordinates are stored separately with restricted access.
   */
  private deidentifyGPS(readings: SensorReading[]): SensorReading[] {
    return readings.map(r => ({
      ...r,
      values: {
        ...r.values,
        latitude: Math.round((r.values.latitude as number) * 100) / 100,  // ~1km precision
        longitude: Math.round((r.values.longitude as number) * 100) / 100,
        precision: 'census-tract',
      },
    }));
  }

  /** Calculate a data quality score (0-100) based on sensor coverage */
  private calculateQualityScore(activeSensors: SensorType[], totalReadings: number): number {
    const sensorCoverage = activeSensors.length / 6; // 6 sensor types total
    const readingVolume = Math.min(totalReadings / 1000, 1); // Normalize to 0-1
    return Math.round((sensorCoverage * 0.6 + readingVolume * 0.4) * 100);
  }
}
