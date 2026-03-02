---
on:
  schedule: daily
permissions:
  contents: read
  issues: read
  pull-requests: read
safe-outputs:
  create-issue:
    title-prefix: "[repo status] "
    labels: [report, automated]
tools:
  github:
---

# Daily EARS Repository Status Report

Create a daily status report for the EARS engineering team.

## What to Include

### Open Pull Requests
- List all open PRs with: title, author, age, review status
- Flag any PRs older than 3 days as needing attention
- Note PRs that are blocked on reviews

### Recent Activity (Last 24 Hours)
- New issues opened
- Issues closed
- PRs merged
- Commits to main branch

### CI/CD Health
- Latest CI run status for the main branch
- Any failing checks or flaky tests
- Security scanning results (code scanning alerts, dependency vulnerabilities)

### Coding Agent Activity
- Sessions started by Copilot, Claude, or Codex agents
- PRs opened by agents and their review status
- Any agent sessions that failed or need human intervention

### Actionable Next Steps
Based on the above data, suggest 3-5 prioritized next steps for the team.
Focus on: unblocking PRs, fixing CI, addressing security alerts, and closing stale issues.

## Format
Use clear markdown with tables where appropriate. Keep the report concise — 
engineering leads should be able to scan it in under 2 minutes.
