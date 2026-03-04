import { SensingService } from '../../src/sensing/sensingService';
import { TimeService } from '../../src/utils/timeService';
import { DatabaseService } from '../../src/utils/database';
import { SecureStorageService } from '../../src/utils/secureStorage';
import { VALID_ACCELEROMETER_BATCH, VALID_GPS_BATCH, EMPTY_BATCH } from '../fixtures/sensorFixtures';

// Mock dependencies
jest.mock('../../src/utils/database');
jest.mock('../../src/utils/secureStorage');

describe('SensingService', () => {
  let service: SensingService;
  let mockDbQuery: jest.SpyInstance;
  let mockStorageEncryptAndStore: jest.SpyInstance;

  beforeEach(() => {
    service = new SensingService();

    // Mock database query method
    mockDbQuery = jest.spyOn(DatabaseService, 'query').mockResolvedValue({
      rows: [],
      rowCount: 0,
      command: '',
      oid: 0,
      fields: [],
    });

    // Mock secure storage
    mockStorageEncryptAndStore = jest.spyOn(SecureStorageService.prototype, 'encryptAndStore')
      .mockResolvedValue(undefined);
  });

  afterEach(() => {
    TimeService.clearMock();
    jest.clearAllMocks();
  });

  describe('ingestBatch()', () => {
    it('should successfully ingest a valid accelerometer batch', async () => {
      const batch = {
        ...VALID_ACCELEROMETER_BATCH,
        receivedAt: '2026-03-01T12:00:00.000Z',
      };

      const result = await service.ingestBatch(batch);

      expect(result.batchId).toBe(batch.batchId);
      expect(result.recordsIngested).toBe(batch.readings.length);
      expect(result.processingTimeMs).toBeGreaterThanOrEqual(0);
      expect(typeof result.processingTimeMs).toBe('number');
    });

    it('should use TimeService for deterministic processing time measurement', async () => {
      // Set mock time to a fixed timestamp
      const mockStartTime = '2026-03-01T12:00:00.000Z';
      TimeService.setMock(mockStartTime);

      const batch = {
        ...VALID_ACCELEROMETER_BATCH,
        receivedAt: mockStartTime,
      };

      // The processing time should be 0 since time is mocked and doesn't advance
      const result = await service.ingestBatch(batch);

      expect(result.processingTimeMs).toBe(0);
      expect(result.batchId).toBe(batch.batchId);
    });

    it('should validate and reject empty batches', async () => {
      const batch = {
        ...EMPTY_BATCH,
        receivedAt: '2026-03-01T12:00:00.000Z',
      };

      await expect(service.ingestBatch(batch)).rejects.toThrow('Batch must contain at least one reading');
    });

    it('should validate and reject batches with missing timestamps', async () => {
      const batch = {
        batchId: 'batch-bad-001',
        deviceId: 'device-test-abc123',
        sensorType: 'accelerometer' as const,
        receivedAt: '2026-03-01T12:00:00.000Z',
        readings: [
          { timestamp: '', values: { x: 0.1, y: -0.9, z: 0.0 } },
        ],
      };

      await expect(service.ingestBatch(batch)).rejects.toThrow('Each reading must have a timestamp');
    });

    it('should encrypt and store sensor data', async () => {
      const batch = {
        ...VALID_ACCELEROMETER_BATCH,
        receivedAt: '2026-03-01T12:00:00.000Z',
      };

      await service.ingestBatch(batch);

      expect(mockStorageEncryptAndStore).toHaveBeenCalledTimes(1);
      expect(mockStorageEncryptAndStore).toHaveBeenCalledWith(
        `sensing/${batch.sensorType}/${batch.batchId}.json`,
        expect.stringContaining(batch.batchId)
      );
    });

    it('should de-identify GPS coordinates before storage', async () => {
      const batch = {
        ...VALID_GPS_BATCH,
        receivedAt: '2026-03-01T12:00:00.000Z',
      };

      await service.ingestBatch(batch);

      expect(mockStorageEncryptAndStore).toHaveBeenCalledTimes(1);
      const storedData = JSON.parse(mockStorageEncryptAndStore.mock.calls[0][1]);

      // Verify GPS coordinates were generalized (rounded to 2 decimal places)
      expect(storedData.readings[0].values.latitude).toBe(44.05); // 44.04505 → 44.05
      expect(storedData.readings[0].values.longitude).toBe(-123.07); // -123.07246 → -123.07
      expect(storedData.readings[0].values.precision).toBe('census-tract');
    });

    it('should record metadata in database', async () => {
      const batch = {
        ...VALID_ACCELEROMETER_BATCH,
        receivedAt: '2026-03-01T12:00:00.000Z',
      };

      await service.ingestBatch(batch);

      expect(mockDbQuery).toHaveBeenCalledWith(
        'INSERT INTO sensor_batches (batch_id, device_id, sensor_type, reading_count, received_at) VALUES ($1, $2, $3, $4, $5)',
        [batch.batchId, batch.deviceId, batch.sensorType, batch.readings.length, batch.receivedAt]
      );
    });
  });

  describe('checkDuplicate()', () => {
    it('should return true for duplicate batch IDs', async () => {
      mockDbQuery.mockResolvedValueOnce({
        rows: [{ exists: true }],
        rowCount: 1,
        command: '',
        oid: 0,
        fields: [],
      });

      const isDuplicate = await service.checkDuplicate('batch-accel-001');
      expect(isDuplicate).toBe(true);
    });

    it('should return false for new batch IDs', async () => {
      mockDbQuery.mockResolvedValueOnce({
        rows: [],
        rowCount: 0,
        command: '',
        oid: 0,
        fields: [],
      });

      const isDuplicate = await service.checkDuplicate('batch-new-999');
      expect(isDuplicate).toBe(false);
    });
  });

  describe('TimeService integration', () => {
    it('should measure processing time using TimeService.utcNowMs()', async () => {
      // Mock TimeService to advance time predictably
      let callCount = 0;

      jest.spyOn(TimeService, 'utcNowMs').mockImplementation(() => {
        callCount++;
        if (callCount === 1) {
          return 1000000; // Start time
        } else {
          return 1000050; // End time (50ms later)
        }
      });

      const batch = {
        ...VALID_ACCELEROMETER_BATCH,
        receivedAt: '2026-03-01T12:00:00.000Z',
      };

      const result = await service.ingestBatch(batch);

      expect(result.processingTimeMs).toBe(50);
      expect(TimeService.utcNowMs).toHaveBeenCalledTimes(2);
    });
  });
});
