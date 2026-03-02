# EARS Platform — System Architecture

## Overview

The Ecological Assessment and Recovery System (EARS) is a digital mental health platform
built by Ksana Health to collect, process, and analyze behavioral biomarker data from
smartphones. It combines passive sensing with Ecological Momentary Assessments (EMA) to
provide clinicians with a continuous, objective picture of patient mental health.

## High-Level Architecture

```
                           ┌──────────────────────┐
                           │   Mobile App (iOS /   │
                           │   Android)            │
                           │  ┌────────┐ ┌──────┐ │
                           │  │Sensing │ │ EMA  │ │
                           │  │Engine  │ │Survey│ │
                           │  └───┬────┘ └──┬───┘ │
                           └──────┼─────────┼─────┘
                                  │         │
                         encrypted│ TLS 1.3 │ encrypted
                                  │         │
                           ┌──────▼─────────▼─────┐
                           │   API Gateway (APIM)  │
                           │   Rate Limiting        │
                           │   Auth (Azure AD B2C)  │
                           └──────┬─────────┬──────┘
                                  │         │
                    ┌─────────────▼──┐  ┌───▼──────────────┐
                    │  Sensing API   │  │  Survey API       │
                    │  /api/sensing  │  │  /api/surveys     │
                    │                │  │  /api/responses   │
                    └───────┬────────┘  └───────┬───────────┘
                            │                   │
                    ┌───────▼───────────────────▼───────────┐
                    │                                       │
                    │         Business Logic Layer          │
                    │  ┌──────────────┐ ┌───────────────┐  │
                    │  │ SensingService│ │ SurveyService │  │
                    │  │ - ingest()   │ │ - create()    │  │
                    │  │ - deidentify│ │ - validate()  │  │
                    │  │ - batch()   │ │ - respond()   │  │
                    │  └──────┬───────┘ └──────┬────────┘  │
                    │         │                │            │
                    │  ┌──────▼────────────────▼─────────┐ │
                    │  │       Utility Layer              │ │
                    │  │  SecureStorage · Logger ·        │ │
                    │  │  TimeService · Config · Database │ │
                    │  └──────┬──────────────────┬───────┘ │
                    └─────────┼──────────────────┼─────────┘
                              │                  │
                    ┌─────────▼──────┐  ┌────────▼───────────┐
                    │ Azure Blob     │  │ PostgreSQL          │
                    │ Storage        │  │ (Azure Flexible     │
                    │ (encrypted     │  │  Server)            │
                    │  sensor data)  │  │ (surveys, metadata) │
                    └────────────────┘  └─────────────────────┘
```

## Key Components

### 1. Mobile App (iOS / Android)
- **Sensing Engine**: Collects accelerometer, GPS, screen-usage, and keyboard metadata
  at configurable intervals. All data is encrypted at rest on device using AES-256 before
  batch upload.
- **EMA Survey Module**: Renders adaptive surveys with skip logic. Supports Likert,
  multiple-choice, free-text, and time-of-day question types. Implements signal-contingent
  and interval-contingent scheduling.

### 2. API Gateway (Azure API Management)
- TLS 1.3 termination
- Azure AD B2C token validation
- Rate limiting: 100 req / 15 min per user
- Request logging (PHI-free audit trail)

### 3. Sensing API (`/api/sensing`)
- Accepts encrypted sensor batches
- Performs idempotency check via `batchId`
- De-identifies GPS coordinates (reduces precision to ~1.1 km grid)
- Stores raw data in Azure Blob Storage with encryption at rest
- Writes metadata to PostgreSQL for indexing

### 4. Survey API (`/api/surveys`)
- CRUD for survey configurations
- Validates survey structure (question types, skip logic, schedules)
- Stores responses with encrypted identifiers
- Enforces minimum interval between consecutive surveys (30 minutes)

### 5. Utility Layer
| Service | Purpose | Security |
|---------|---------|----------|
| `SecureStorage` | AES-256 encrypt/decrypt for PHI | Keys from Azure Key Vault |
| `Logger` | Structured JSON logging with PHI scrubbing | Auto-redacts participantId, deviceId, GPS |
| `TimeService` | Deterministic UTC timestamps | Mockable for testing |
| `ConfigService` | Type-safe configuration | Never reads `process.env` directly |
| `DatabaseService` | Connection pooling for PostgreSQL | SSL required, min TLS 1.2 |

## Data Flow: Sensor Ingestion

1. Mobile app batches 5 minutes of sensor readings
2. Batch encrypted on device → uploaded via `POST /api/sensing/upload`
3. API validates auth token → audit logs the request
4. `SensingService.ingest()` checks `batchId` for idempotency
5. GPS coordinates de-identified (precision reduced)
6. Batch stored in Azure Blob Storage (SSE + customer-managed keys)
7. Metadata record written to PostgreSQL
8. Response: `201 Created` with `batchId` and `receivedAt` timestamp

## Data Flow: EMA Survey Response

1. App receives push notification (scheduled or signal-contingent)
2. User completes survey → response encrypted on device
3. `POST /api/surveys/:surveyId/responses` with encrypted payload
4. `SurveyValidator` checks response completeness and skip logic
5. Response stored with encrypted `participantId`
6. Clinician dashboard queries aggregated (never individual) data

## Security Architecture

### HIPAA Compliance Controls
- **§164.312(a)(1)** Access Control: Azure AD B2C + RBAC roles
- **§164.312(a)(2)(iv)** Encryption: AES-256 at rest, TLS 1.3 in transit
- **§164.312(b)** Audit Controls: All PHI access logged, 7-year retention
- **§164.312(c)(1)** Integrity Controls: Checksums on sensor batches
- **§164.312(e)(1)** Transmission Security: Certificate pinning on mobile

### De-identification Strategy
Sensor data follows Safe Harbor method (§164.514(b)):
- GPS reduced to 0.01° precision (~1.1 km grid)
- Timestamps rounded to nearest minute for aggregate queries
- No direct identifiers in analytics tables

## Technology Stack

| Layer | Technology | Justification |
|-------|-----------|--------------|
| Language | TypeScript 5.x | Type safety, ecosystem |
| Runtime | Node.js 20 LTS | Performance, Azure support |
| Framework | Express 4.x | Lightweight, well-understood |
| Database | PostgreSQL 16 | ACID compliance, JSONB for flexible schemas |
| Object Storage | Azure Blob Storage | HIPAA-eligible, encryption, lifecycle |
| Auth | Azure AD B2C | OAuth 2.0, HIPAA BAA available |
| CI/CD | GitHub Actions | Native VCS integration |
| Monitoring | Azure Monitor + App Insights | Distributed tracing, KQL |
