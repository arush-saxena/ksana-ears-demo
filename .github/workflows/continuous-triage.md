---
on:
  issues:
    types: [opened]
permissions:
  contents: read
  issues: write
safe-outputs:
  add-labels:
    allowed-labels: [bug, feature, security, survey-engine, sensing, api, dashboard, documentation, good-first-issue, needs-triage]
  add-comment:
    max-length: 1000
tools:
  github:
---

# Continuous Issue Triage for EARS

When a new issue is opened in this repository, analyze it and perform triage.

## Triage Steps

### 1. Categorize the Issue
Determine which EARS module is affected:
- `survey-engine` — EMA survey configuration, rendering, skip logic
- `sensing` — Passive data collection (accelerometer, GPS, screen, etc.)
- `api` — REST API routes, authentication, data endpoints
- `dashboard` — Research/clinician web dashboard
- `documentation` — Docs, README, compliance guides

### 2. Assess Severity
- **security** — Any issue involving PHI exposure, auth bypass, encryption, or audit logging
- **bug** — Broken functionality that affects participants or researchers
- **feature** — New capability request
- **good-first-issue** — Well-scoped, low-risk issues suitable for new contributors or AI agents

### 3. Add Labels
Apply the appropriate module label AND severity/type label.

### 4. Add a Triage Comment
Post a brief comment summarizing:
- What module is affected
- Suggested priority (P0-critical, P1-high, P2-medium, P3-low)
- Whether this touches PHI data paths (if yes, flag for security review)
- Suggested assignee type: human engineer, or suitable for an AI coding agent

## Rules
- If the issue mentions patient data, PHI, encryption, or authentication → always add `security` label
- If the issue is unclear, add `needs-triage` label and ask the author for more details
- Never include PHI or sensitive data in triage comments
