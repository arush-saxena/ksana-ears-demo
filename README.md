# EARS — Effortless Assessment Research System

> Mobile sensing platform for behavioral health research

[![CI](https://img.shields.io/badge/CI-passing-brightgreen)]()
[![Coverage](https://img.shields.io/badge/coverage-82%25-yellow)]()
[![License](https://img.shields.io/badge/license-proprietary-blue)]()

## Overview

EARS is Ksana Health's flagship research platform for collecting passive mobile sensing data and ecological momentary assessments (EMA) from study participants in clinical trials.

### Key Capabilities

- **Passive Sensing** — Accelerometer, GPS, screen usage, call/text metadata (no content), typing dynamics
- **EMA Surveys** — Configurable survey engine with skip logic, branching, and multimedia support
- **Real-Time Dashboards** — Clinician and researcher views of participant engagement and data quality
- **Data Pipeline** — Encrypted collection → cloud ingestion → de-identification → analytics-ready datasets

## Architecture

```
┌─────────────┐    ┌──────────────┐    ┌─────────────────┐
│  Mobile App  │───▶│  Secure API  │───▶│  Encrypted      │
│  (iOS/Droid) │    │  Gateway     │    │  Cloud Storage   │
└─────────────┘    └──────────────┘    └────────┬────────┘
                                                │
                                       ┌────────▼────────┐
                                       │  Analytics       │
                                       │  Pipeline        │
                                       └────────┬────────┘
                                                │
                                       ┌────────▼────────┐
                                       │  Research        │
                                       │  Dashboard       │
                                       └─────────────────┘
```

## Getting Started

```bash
# Install dependencies
npm install

# Run development server
npm run dev

# Run tests
npm test

# Run with HIPAA-compliant local encryption
EARS_ENCRYPT_LOCAL=true npm run dev
```

## Project Structure

```
src/
├── api/             # REST API routes and middleware
├── surveys/         # EMA survey engine and configuration
├── sensing/         # Passive sensing data collection modules
└── utils/           # Shared utilities (encryption, validation, logging)
tests/               # Unit and integration tests
docs/                # Architecture decisions, compliance docs
.github/
├── agents/          # Custom AI agents for this repo
├── workflows/       # CI/CD and Agentic Workflows
├── ISSUE_TEMPLATE/  # Standardized issue templates
└── copilot-instructions.md
```

## Compliance

All code in this repository must comply with:
- **HIPAA Security Rule** (§164.312) — Technical safeguards for ePHI
- **IRB Protocol Requirements** — Data handling per approved study protocols
- **SOC 2 Type II** — Security and availability controls

See [docs/compliance-guide.md](docs/compliance-guide.md) for details.

## Team

- **Engineering Lead** — Mobile platform & API
- **Data Science** — Analytics pipeline & ML models
- **Security** — Encryption, access controls, audit logging
- **Research Ops** — Study configuration & participant management
