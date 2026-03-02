import { Router, Request, Response, NextFunction } from 'express';
import { SensingService } from '../../sensing/sensingService';
import { SecureStorageService } from '../../utils/secureStorage';
import { Logger } from '../../utils/logger';
import { TimeService } from '../../utils/timeService';

const router = Router();
const logger = new Logger('SensingRoutes');
const sensingService = new SensingService();

/**
 * POST /api/v1/sensing/upload
 * Receive a batch of passive sensing data from a mobile device.
 * Data is encrypted and stored via SecureStorageService.
 *
 * ⚠️  PHI endpoint — GPS coordinates and device metadata are PHI
 */
router.post('/upload', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { batchId, deviceId, sensorType, readings, timestamp } = req.body;

    // Idempotency check — reject duplicate batch uploads
    const isDuplicate = await sensingService.checkDuplicate(batchId);
    if (isDuplicate) {
      logger.info('Duplicate batch upload rejected', { batchId });
      return res.status(409).json({ error: 'Batch already processed' });
    }

    // Validate payload
    if (!readings || !Array.isArray(readings) || readings.length === 0) {
      return res.status(400).json({ error: 'Invalid readings payload' });
    }

    // Process and store sensor data
    const result = await sensingService.ingestBatch({
      batchId,
      deviceId,
      sensorType,
      readings,
      receivedAt: TimeService.utcNow(),
    });

    logger.info('Sensor batch ingested', {
      batchId,
      sensorType,
      readingCount: readings.length,
      processingTimeMs: result.processingTimeMs,
    });

    res.status(201).json({
      data: {
        batchId,
        recordsIngested: result.recordsIngested,
        processingTimeMs: result.processingTimeMs,
      },
    });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/v1/sensing/status/:participantId
 * Get sensing data collection status for a participant.
 * Returns aggregated metrics, not raw sensor data.
 */
router.get('/status/:participantId', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { participantId } = req.params;
    const { startDate, endDate } = req.query;

    const status = await sensingService.getParticipantStatus(
      participantId,
      startDate as string,
      endDate as string,
    );

    res.json({ data: status });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/v1/sensing/quality/:studyId
 * Get aggregated data quality metrics for a study.
 * This returns de-identified study-level statistics.
 */
router.get('/quality/:studyId', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { studyId } = req.params;
    const quality = await sensingService.getStudyDataQuality(studyId);

    res.json({ data: quality });
  } catch (error) {
    next(error);
  }
});

export const sensingRoutes = router;
