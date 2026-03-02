# EARS Platform — Sensor Data Pipeline

## Overview

The sensor data pipeline is responsible for securely ingesting, validating,
de-identifying, and storing passive behavioral data collected from participant
smartphones. This document describes the pipeline architecture, data formats,
and processing guarantees.

## Supported Sensor Types

| Sensor | Sampling Rate | Data Fields | Size / Batch |
|--------|--------------|-------------|-------------|
| Accelerometer | 50 Hz | x, y, z, timestamp | ~180 KB / 5 min |
| GPS | 1 / 5 min | latitude, longitude, accuracy, timestamp | ~2 KB / 5 min |
| Screen Usage | Event-driven | event (lock/unlock), duration, timestamp | ~1 KB / 5 min |
| Keyboard Metadata | Event-driven | sessionDuration, wordCount, deletions | ~500 B / session |

## Batch Upload Protocol

### Request Format
```json
{
  "batchId": "uuid-v4",
  "deviceId": "encrypted-device-id",
  "participantId": "encrypted-participant-id",
  "sensorType": "accelerometer",
  "startTime": "2026-01-15T09:00:00.000Z",
  "endTime": "2026-01-15T09:05:00.000Z",
  "readings": [
    {
      "timestamp": "2026-01-15T09:00:00.020Z",
      "values": { "x": 0.02, "y": 9.78, "z": 0.15 }
    }
  ],
  "checksum": "sha256:abc123..."
}
```

### Idempotency
- `batchId` is client-generated (UUID v4)
- Server checks for existing `batchId` before processing
- Duplicate batches return `200 OK` with original `receivedAt`
- New batches return `201 Created`

### Checksum Verification
- Client computes SHA-256 over the `readings` array (JSON-serialized, sorted keys)
- Server recomputes and rejects mismatched batches with `400 Bad Request`

## Processing Pipeline

```
Mobile Device
     │
     ▼
┌─────────────────────┐
│ 1. Auth & Rate Limit│  Validate Bearer token, check rate limits
└─────────┬───────────┘
          │
          ▼
┌─────────────────────┐
│ 2. Idempotency      │  Check batchId in PostgreSQL
│    Check             │  → Duplicate? Return cached response
└─────────┬───────────┘
          │ (new batch)
          ▼
┌─────────────────────┐
│ 3. Checksum         │  Recompute SHA-256 over readings
│    Verification      │  → Mismatch? Reject 400
└─────────┬───────────┘
          │
          ▼
┌─────────────────────┐
│ 4. De-identification│  GPS: reduce to 0.01° grid
│                      │  Remove any direct identifiers
└─────────┬───────────┘
          │
          ▼
┌─────────────────────┐
│ 5. Encryption       │  AES-256-GCM with Key Vault key
│    & Storage         │  → Azure Blob Storage (SSE-CMK)
└─────────┬───────────┘
          │
          ▼
┌─────────────────────┐
│ 6. Metadata Write   │  Record in PostgreSQL:
│                      │  batchId, sensorType, timeRange,
│                      │  blobPath, receivedAt, recordCount
└─────────────────────┘
```

## De-identification Rules

### GPS Coordinates
```typescript
// Reduce precision to ~1.1 km grid
function deidentifyGPS(lat: number, lon: number): { lat: number; lon: number } {
  return {
    lat: Math.round(lat * 100) / 100,  // 0.01° ≈ 1.1 km
    lon: Math.round(lon * 100) / 100,
  };
}
```

### Timestamps
- Raw timestamps preserved in encrypted blob (research access only)
- Aggregate queries round to nearest hour
- Time zones stripped; all timestamps in UTC

### Device Identifiers
- `deviceId` is a one-way hash of the actual device ID
- `participantId` is a study-assigned pseudonym, not linked to real identity
- Mapping table stored separately in a restricted Key Vault-protected database

## Storage Architecture

### Azure Blob Storage
- **Container**: `sensor-data-{studyId}`
- **Path**: `{sensorType}/{YYYY}/{MM}/{DD}/{batchId}.enc`
- **Encryption**: SSE with customer-managed keys (Azure Key Vault)
- **Access Tier**: Hot (recent 30 days) → Cool (30-90 days) → Archive (90+ days)
- **Retention**: Configurable per study, default 7 years for compliance

### PostgreSQL Metadata
```sql
CREATE TABLE sensor_batches (
    batch_id        UUID PRIMARY KEY,
    participant_id  TEXT NOT NULL,       -- encrypted
    sensor_type     TEXT NOT NULL,
    start_time      TIMESTAMPTZ NOT NULL,
    end_time        TIMESTAMPTZ NOT NULL,
    record_count    INTEGER NOT NULL,
    blob_path       TEXT NOT NULL,
    checksum        TEXT NOT NULL,
    received_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    study_id        TEXT NOT NULL,

    CONSTRAINT valid_sensor_type
        CHECK (sensor_type IN ('accelerometer', 'gps', 'screen_usage', 'keyboard'))
);

CREATE INDEX idx_batches_participant ON sensor_batches (participant_id, sensor_type);
CREATE INDEX idx_batches_time ON sensor_batches (start_time, end_time);
CREATE INDEX idx_batches_study ON sensor_batches (study_id);
```

## Error Handling

| Error | HTTP Status | Action |
|-------|------------|--------|
| Missing auth token | 401 | Reject, log audit event |
| Rate limit exceeded | 429 | Reject, include retry-after header |
| Duplicate batchId | 200 | Return cached response (idempotent) |
| Checksum mismatch | 400 | Reject, log warning |
| Invalid sensor type | 400 | Reject with validation details |
| Blob storage failure | 503 | Retry 3x with exponential backoff, then fail |
| Database timeout | 503 | Retry 2x, then fail with incident alert |

## Monitoring & Alerts

| Metric | Threshold | Alert |
|--------|-----------|-------|
| Batch ingestion rate | < 50% of baseline for 15 min | P2 - Potential device connectivity issue |
| Checksum failure rate | > 1% over 1 hour | P1 - Data integrity concern |
| Blob storage latency | P95 > 2 seconds | P3 - Performance degradation |
| De-identification errors | Any occurrence | P1 - PHI exposure risk |
| Duplicate batch rate | > 20% over 1 hour | P3 - Client retry storm |
