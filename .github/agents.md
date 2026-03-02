# agents.md — Ksana Health EARS Repository

## About This Project
EARS (Effortless Assessment Research System) is a mobile sensing and EMA survey platform
for behavioral health research. It handles Protected Health Information (PHI) and must
comply with HIPAA Security Rule §164.312.

## Before Writing Code
1. Always produce a 3-5 step plan and present it before implementing
2. Identify which module the change belongs to (api, surveys, sensing, utils)
3. Check if the change touches any PHI data paths — if yes, add audit logging
4. Review existing tests in `tests/` to understand testing patterns

## Coding Rules
- TypeScript strict mode, no `any` types
- All functions under 50 lines
- JSDoc on all public exports
- Use `TimeService.utcNow()` instead of `Date.now()`
- Use `ConfigService.get()` instead of `process.env`
- Use `DatabaseService.pool` instead of creating new connections
- Use `SecureStorageService` for all file writes involving participant data

## Security Rules (Non-Negotiable)
- NEVER log PHI in any form (names, device IDs, survey responses, coordinates)
- ALL database queries must use parameterized statements
- ALL API routes handling participant data need auth middleware + audit middleware
- Encryption: AES-256 at rest, TLS 1.3 in transit
- New API endpoints must be added to the security review checklist in `docs/security-checklist.md`

## Testing Rules
- Write tests for all new code (minimum 80% coverage for the new module)
- Use fixtures from `tests/fixtures/` — never use real participant data
- Security-sensitive changes need both unit tests and integration tests
- Run `npm test` and `npm run lint` before marking work as complete

## PR Description Guidelines
- Start with a one-line summary of what changed and why
- List which EARS module(s) are affected
- Note if PHI data paths are touched (triggers security review)
- Include test coverage delta
