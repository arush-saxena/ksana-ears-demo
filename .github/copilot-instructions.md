# Copilot Instructions for EARS Platform

## Project Context
This is the EARS (Effortless Assessment Research System) platform by Ksana Health.
It collects passive mobile sensing data and EMA surveys for behavioral health research.
All code handles Protected Health Information (PHI) and must comply with HIPAA.

## Coding Standards
- TypeScript strict mode for all API and web dashboard code
- Use ES modules (`import`/`export`), never CommonJS (`require`)
- All API responses must have TypeScript interfaces — no `any` types
- Use `async/await` over raw Promises
- Maximum function length: 50 lines. Extract helpers for longer logic.
- All public functions must have JSDoc comments

## Security Requirements (CRITICAL)
- **Never** log PHI (names, device IDs, survey responses, GPS coordinates) in plaintext
- All API endpoints handling participant data require JWT authentication + audit logging
- Data at rest uses AES-256 encryption — see `src/utils/encryption.ts`
- Data in transit requires TLS 1.3
- Use parameterized queries exclusively — no string concatenation for database queries
- All file writes to participant data must go through `SecureStorageService`

## Testing Requirements
- Minimum 80% code coverage for new modules
- Integration tests required for any data pipeline changes
- Snapshot tests for survey rendering components
- All tests must use anonymized fixture data — never real participant data
- Security-sensitive code requires both unit tests AND a review from a security team member

## Architecture Patterns
- **API Layer**: Express.js routes → middleware (auth, audit) → controllers → services
- **Survey Engine**: JSON schema validation → skip logic resolver → renderer
- **Sensing Pipeline**: Device SDK → local buffer → encrypted upload → cloud ingestion
- **Database**: PostgreSQL for structured data, Azure Blob for raw sensor files

## Common Pitfalls to Avoid
- Don't use `Date.now()` for timestamps — use `TimeService.utcNow()` for testability
- Don't access `process.env` directly — use `ConfigService` for type-safe config
- Don't create new database connections — use the connection pool from `DatabaseService`
- Survey question IDs must be UUIDs, not sequential integers (prevents enumeration)
