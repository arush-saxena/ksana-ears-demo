/**
 * Test fixture: Anonymized sensor data batches.
 * ⚠️  NEVER use real participant data in test fixtures.
 * All device IDs, coordinates, and timestamps are synthetic.
 */

export const VALID_ACCELEROMETER_BATCH = {
  batchId: 'batch-accel-001',
  deviceId: 'device-test-abc123',
  sensorType: 'accelerometer' as const,
  readings: [
    { timestamp: '2026-03-01T10:00:00.000Z', values: { x: 0.12, y: -0.98, z: 0.03 } },
    { timestamp: '2026-03-01T10:00:00.100Z', values: { x: 0.15, y: -0.95, z: 0.05 } },
    { timestamp: '2026-03-01T10:00:00.200Z', values: { x: 0.11, y: -0.97, z: 0.02 } },
    { timestamp: '2026-03-01T10:00:00.300Z', values: { x: 0.18, y: -0.92, z: 0.08 } },
    { timestamp: '2026-03-01T10:00:00.400Z', values: { x: 0.14, y: -0.96, z: 0.04 } },
  ],
};

export const VALID_GPS_BATCH = {
  batchId: 'batch-gps-001',
  deviceId: 'device-test-abc123',
  sensorType: 'gps' as const,
  readings: [
    {
      timestamp: '2026-03-01T10:00:00Z',
      values: { latitude: 44.04505, longitude: -123.07246, accuracy: 15, altitude: 130 },
    },
    {
      timestamp: '2026-03-01T10:05:00Z',
      values: { latitude: 44.04612, longitude: -123.07189, accuracy: 10, altitude: 132 },
    },
    {
      timestamp: '2026-03-01T10:10:00Z',
      values: { latitude: 44.04718, longitude: -123.07102, accuracy: 12, altitude: 131 },
    },
  ],
};

export const VALID_SCREEN_USAGE_BATCH = {
  batchId: 'batch-screen-001',
  deviceId: 'device-test-abc123',
  sensorType: 'screen-usage' as const,
  readings: [
    { timestamp: '2026-03-01T08:00:00Z', values: { event: 'screen_on', app: 'com.ksana.ears' } },
    { timestamp: '2026-03-01T08:15:30Z', values: { event: 'screen_off', app: 'com.ksana.ears' } },
    { timestamp: '2026-03-01T09:00:00Z', values: { event: 'screen_on', app: 'com.android.chrome' } },
    { timestamp: '2026-03-01T09:22:15Z', values: { event: 'screen_off', app: 'com.android.chrome' } },
  ],
};

export const EMPTY_BATCH = {
  batchId: 'batch-empty-001',
  deviceId: 'device-test-abc123',
  sensorType: 'accelerometer' as const,
  readings: [],
};

export const INVALID_BATCH_NO_TIMESTAMPS = {
  batchId: 'batch-bad-001',
  deviceId: 'device-test-abc123',
  sensorType: 'accelerometer' as const,
  readings: [
    { timestamp: '', values: { x: 0.1, y: -0.9, z: 0.0 } },
    { values: { x: 0.2, y: -0.8, z: 0.1 } },  // missing timestamp entirely
  ],
};

export const DUPLICATE_BATCH = {
  batchId: 'batch-accel-001',  // Same batchId as VALID_ACCELEROMETER_BATCH
  deviceId: 'device-test-abc123',
  sensorType: 'accelerometer' as const,
  readings: [
    { timestamp: '2026-03-01T11:00:00Z', values: { x: 0.5, y: -0.5, z: 0.1 } },
  ],
};
