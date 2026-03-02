# Demo Issues — Ready to Assign During Live Demo

These are pre-written GitHub Issues formatted using the **WRAP framework**.
During the live demo, create these issues in the repository and assign them
to different agents (Copilot, Claude, Codex) to showcase Agent HQ capabilities.

---

## Issue 1: PHI Logging Bug (Assign to → Copilot)

**Title:** `[Bug]: PHI (participantId) logged in plaintext in survey response endpoint`

**Labels:** `bug`, `security`, `hipaa`, `P1`

**Body:**

### What (the problem)
The `POST /api/surveys/:surveyId/responses` endpoint logs the `participantId`
in plaintext via `console.log()` on line ~67 of `src/api/routes/surveys.ts`.
This violates HIPAA §164.312(b) audit controls and our logging standards.

### Requirements
- Remove the `console.log()` statement that exposes participantId
- Replace with `Logger` from `src/utils/logger.ts` which auto-redacts PHI fields
- Ensure no other PHI fields (deviceId, GPS coords) are logged in plaintext
- The `npm run audit:logs` script should pass after the fix

### Architecture & Approach
- The `Logger` class already handles PHI scrubbing — just switch from `console.log` to `logger.info`
- Check `src/api/routes/sensing.ts` as well for similar patterns
- Reference: `docs/compliance-guide.md` → Logging Standards section

### Plan
1. Replace `console.log` with `logger.info` in surveys.ts
2. Search all `src/` files for other `console.log` occurrences
3. Run `npm run audit:logs` to verify
4. Add/update unit test confirming PHI is scrubbed from log output
5. Verify CI pipeline `hipaa-compliance-check` job passes

---

## Issue 2: Timestamp Bug in Sensing Service (Assign to → Claude)

**Title:** `[Bug]: SensingService uses Date.now() instead of TimeService — breaks test determinism`

**Labels:** `bug`, `testing`, `P3`

**Body:**

### What (the problem)
`src/sensing/sensingService.ts` uses `Date.now()` directly for the `receivedAt`
timestamp instead of `TimeService.utcNow()`. This:
1. Makes unit tests non-deterministic (timestamps vary per run)
2. Violates our codebase convention (all timestamps via TimeService)
3. Could cause timezone issues in multi-region deployments

### Requirements
- Replace `Date.now()` with `TimeService.utcNow()` in `SensingService`
- Add import for `TimeService` from `../../utils/timeService`
- Ensure existing tests still pass
- Add a test that uses `TimeService.setMock()` to verify deterministic timestamps

### Architecture & Approach
- `TimeService` is already used elsewhere (see `src/utils/timeService.ts`)
- It supports `setMock()` and `clearMock()` for test isolation
- See `.github/copilot-instructions.md` → "Common Pitfalls" section

### Plan
1. Update SensingService to import and use TimeService
2. Run existing tests: `npm test -- --testPathPattern=sensing`
3. Add new test case verifying mock timestamp flows through
4. Run full test suite to check for regressions

---

## Issue 3: Hardcoded process.env in SecureStorage (Assign to → Codex)

**Title:** `[Bug]: SecureStorage reads process.env directly instead of ConfigService`

**Labels:** `bug`, `security`, `P2`

**Body:**

### What (the problem)
`src/utils/secureStorage.ts` reads `process.env.ENCRYPTION_KEY` directly instead
of using `ConfigService.get('ENCRYPTION_KEY')`. This bypasses our centralized
configuration management and violates the security standard documented in
`docs/compliance-guide.md`.

### Requirements
- Replace `process.env.ENCRYPTION_KEY` with `ConfigService.get('ENCRYPTION_KEY')`
- Add import for `ConfigService` from `./config`
- Ensure the CI `hipaa-compliance-check` job's `process.env` scan passes
- No other `process.env` usage should exist in `src/` (except `config.ts`)

### Architecture & Approach
- `ConfigService` (`src/utils/config.ts`) handles environment variable access
  with validation, defaults, and type safety
- It's the single approved entry point for all configuration
- Reference: `.github/copilot-instructions.md` → Architecture section

### Plan
1. Update secureStorage.ts to use ConfigService
2. Grep `src/` for any remaining `process.env` usage
3. Run `npm run typecheck` to verify types
4. Run CI hipaa-compliance-check locally to confirm

---

## Issue 4: Feature — Add Audio Diary Sensor Support (Assign to → Copilot)

**Title:** `[Feature]: Add audio diary sensor type for voice journaling studies`

**Labels:** `enhancement`, `sensing`, `P3`

**Body:**

### What (the goal)
Researchers want to collect short audio diaries (voice journals) from participants
as a new passive sensing modality. This requires extending the sensing pipeline
to accept, validate, and store audio recordings with the same security guarantees
as other sensor types.

### Requirements
- Add `'audio_diary'` to the valid sensor types
- Accept audio batches via `POST /api/sensing/upload` with `sensorType: 'audio_diary'`
- Maximum recording duration: 5 minutes per entry
- Supported formats: m4a, opus
- Strip audio metadata (recording device info, GPS in EXIF)
- Encrypt with AES-256 before storage
- Store in separate blob container: `audio-data-{studyId}`
- Unit tests with ≥80% coverage for new code

### Architecture & Approach
1. Create `src/sensing/audioProcessor.ts`:
   - `validateFormat(buffer)` — check magic bytes for m4a/opus
   - `stripMetadata(buffer)` — remove EXIF-equivalent tags
   - `validateDuration(buffer)` — reject if > 5 minutes
2. Extend `SensingService.ingest()` to route audio_diary to AudioProcessor
3. Update `src/api/routes/sensing.ts` to accept larger payloads for audio
4. Add blob container config in `src/utils/config.ts`

### Plan
1. Create AudioProcessor with validation and metadata stripping
2. Extend SensingService to handle audio_diary type
3. Add route-level body size limit (10 MB for audio)
4. Write unit tests for format validation
5. Write integration test for full upload flow
6. Update docs/architecture/data-pipeline.md with audio specs
7. HIPAA review: verify no audio metadata leaks

---

## Issue 5: Multi-Agent Comparison — Refactor Survey Validator (Assign to ALL THREE)

**Title:** `[Feature]: Refactor SurveyValidator to support pluggable validation rules`

**Labels:** `enhancement`, `refactor`, `P3`

**Body:**

> **Demo Note:** Create this issue THREE times (or use it once and reassign).
> Assign to Copilot first, then Claude, then Codex. Compare the approaches
> each agent takes — this is the "Multi-Agent Comparison" demo moment.

### What (the goal)
The current `SurveyValidator` has all validation rules hardcoded in a single
`validate()` method. As we add more question types and validation rules,
this becomes hard to maintain. Refactor to a pluggable rule-based architecture.

### Requirements
- Create a `ValidationRule` interface with `name`, `validate(config)`, and `severity`
- Extract each existing check into its own rule class
- `SurveyValidator.validate()` should iterate over registered rules
- Rules should be addable/removable at runtime (for study-specific configs)
- All existing tests must continue to pass
- Add at least one new custom rule as a demonstration

### Architecture & Approach
- Pattern: Strategy pattern with rule registry
- Each rule implements `ValidationRule` interface
- Validator maintains `rules: ValidationRule[]` array
- `addRule()` and `removeRule()` for runtime customization

### Plan
1. Define `ValidationRule` interface in `src/surveys/types.ts`
2. Extract rules: DuplicateIdRule, SkipLogicRule, IntervalRule, LikertScaleRule, etc.
3. Refactor SurveyValidator to use rule registry
4. Verify all existing tests pass unchanged
5. Add a new `ConditionalRequiredRule` as demonstration
6. Update docs if needed

---

## Quick-Reference: Which Agent Gets Which Issue

| # | Issue | Assign To | Demo Purpose |
|---|-------|-----------|-------------|
| 1 | PHI Logging Bug | **Copilot** | Security fix with HIPAA context |
| 2 | Timestamp Bug | **Claude** | Code convention fix with testing |
| 3 | process.env Bug | **Codex** | Config refactor with compliance scan |
| 4 | Audio Diary Feature | **Copilot** | New feature with architecture |
| 5 | Validator Refactor | **All Three** | Multi-agent comparison |

## Tips for Live Demo

1. **Create issues one at a time** — walk through the WRAP structure as you paste
2. **Assign via `@copilot`, `@claude`, or `@codex`** in the issue body or comment
3. **Show the agent picker** — demonstrate how agents appear as assignable entities
4. **While agents work**, switch to showing Copilot Spaces or CLI features
5. **Come back to check PRs** — agents will have created pull requests with fixes
6. **For Issue 5**, let one agent finish, then assign to the next to compare approaches
