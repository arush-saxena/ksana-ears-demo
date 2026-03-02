# EARS Platform — HIPAA Compliance Guide

## Scope

This document outlines the HIPAA compliance controls implemented in the EARS
(Ecological Assessment and Recovery System) platform. It maps each HIPAA Security
Rule requirement to specific technical controls in the codebase and infrastructure.

## Covered Entity Relationship

Ksana Health operates as a **Business Associate** under HIPAA, providing data processing
services to Covered Entities (healthcare providers, health plans, and research institutions).
A Business Associate Agreement (BAA) is executed with each partner before any PHI is processed.

## HIPAA Security Rule Mapping

### Administrative Safeguards (§164.308)

| Requirement | EARS Implementation |
|------------|---------------------|
| §164.308(a)(1) Security Management Process | Annual risk assessment, incident response plan |
| §164.308(a)(3) Workforce Security | Role-based access (researcher, clinician, admin, participant) |
| §164.308(a)(4) Information Access Management | Least-privilege RBAC via Azure AD B2C |
| §164.308(a)(5) Security Awareness Training | Quarterly training, phishing simulations |
| §164.308(a)(6) Security Incident Procedures | Automated alerting, 72-hour breach notification |

### Physical Safeguards (§164.310)

| Requirement | EARS Implementation |
|------------|---------------------|
| §164.310(a)(1) Facility Access Control | Azure datacenters (SOC 2 Type II certified) |
| §164.310(d)(1) Device and Media Controls | Mobile app data encrypted at rest, remote wipe capable |

### Technical Safeguards (§164.312)

| Requirement | EARS Implementation | Code Reference |
|------------|---------------------|----------------|
| §164.312(a)(1) Access Control | Bearer token authentication | `src/api/middleware/auth.ts` |
| §164.312(a)(2)(i) Unique User Identification | Azure AD B2C user IDs | `authMiddleware` |
| §164.312(a)(2)(iii) Automatic Logoff | Token expiry (1 hour) | JWT `exp` claim |
| §164.312(a)(2)(iv) Encryption and Decryption | AES-256-GCM | `src/utils/secureStorage.ts` |
| §164.312(b) Audit Controls | Structured audit logging | `src/api/middleware/audit.ts` |
| §164.312(c)(1) Integrity Controls | SHA-256 batch checksums | `SensingService.ingest()` |
| §164.312(d) Person Authentication | Multi-factor via Azure AD B2C | Azure AD B2C policy |
| §164.312(e)(1) Transmission Security | TLS 1.3, certificate pinning | API Gateway config |

## PHI Inventory

The following data elements are classified as Protected Health Information (PHI)
under HIPAA and receive special handling:

| Data Element | Storage Location | Protection Method |
|-------------|-----------------|-------------------|
| Participant ID | PostgreSQL, Blob metadata | Pseudonymized, encrypted |
| Device ID | PostgreSQL | One-way hashed |
| GPS Coordinates | Blob Storage | De-identified to 0.01° grid |
| Survey Responses | PostgreSQL | Encrypted at rest |
| Sensor Readings | Azure Blob Storage | AES-256, customer-managed keys |
| Timestamps | PostgreSQL, Blob | UTC normalized, rounded for analytics |

## Logging Standards

### PHI-Safe Logging
The `Logger` utility (`src/utils/logger.ts`) automatically scrubs PHI from log output:

**Always Redacted:**
- `participantId`
- `deviceId`
- `latitude` / `longitude` (GPS coordinates)
- `email`
- `phone`
- Any field matching `/ssn|social.?security/i`

**Safe to Log:**
- `studyId`
- `sensorType`
- `batchId`
- Generic counts and metrics
- Error messages (verified PHI-free)

### Log Retention
- Audit logs: **7 years** (HIPAA minimum: 6 years)
- Application logs: **90 days** (Azure Monitor)
- Security incident logs: **7 years**

## Encryption Standards

### At Rest
| Data | Algorithm | Key Management |
|------|-----------|----------------|
| Sensor blobs | AES-256-GCM | Azure Key Vault (HSM-backed) |
| Database fields | AES-256 via pgcrypto | Key Vault |
| Mobile device | AES-256 (iOS Keychain / Android Keystore) | Device-managed |

### In Transit
| Connection | Protocol | Certificate |
|-----------|----------|-------------|
| Mobile → API | TLS 1.3 | Azure-managed, cert pinned |
| API → PostgreSQL | TLS 1.2+ | Azure-managed |
| API → Blob Storage | TLS 1.2+ | Azure-managed |
| Internal services | mTLS | Self-signed, rotated quarterly |

## Configuration Security

All configuration must go through `ConfigService` (`src/utils/config.ts`).

**NEVER:**
- Read `process.env` directly in application code
- Hard-code secrets, connection strings, or API keys
- Log configuration values that may contain secrets

**ALWAYS:**
- Use `ConfigService.get('KEY_NAME')` for all config access
- Store secrets in Azure Key Vault
- Use managed identities for Azure service authentication

## Incident Response

### Severity Levels
| Level | Description | Response Time | Example |
|-------|------------|---------------|---------|
| P1 - Critical | PHI exposure confirmed | 1 hour | De-identification failure, unauthorized access |
| P2 - High | Potential PHI exposure | 4 hours | Unusual access patterns, failed auth spike |
| P3 - Medium | Service degradation | 24 hours | Performance issues, elevated error rates |
| P4 - Low | Minor issue | 72 hours | Non-security bugs, documentation gaps |

### Breach Notification
Per HIPAA §164.404-408:
1. **Discovery**: Automated monitoring detects potential breach
2. **Investigation**: Security team assesses within 24 hours
3. **Notification**: If breach confirmed:
   - HHS: within 60 days
   - Affected individuals: within 60 days
   - Media: if > 500 individuals affected
4. **Remediation**: Root cause analysis, control updates

## Code Review Checklist

Every PR touching PHI-adjacent code must verify:

- [ ] No PHI in log statements (Logger redaction confirmed)
- [ ] No `process.env` usage (ConfigService only)
- [ ] No `console.log()` in production code paths
- [ ] No `Date.now()` for timestamps (TimeService only)
- [ ] Encryption used for any new data at rest
- [ ] Audit middleware applied to new PHI endpoints
- [ ] New endpoints require authentication
- [ ] GPS data de-identified before storage
- [ ] Unit tests cover the security-relevant behavior
- [ ] No secrets in code or comments
