# Warehouse - Agent Instructions

## Quick Reference

| Need to... | Go to... |
|------------|----------|
| Use CLI tools | `agent-instructions/cli-tools.md` |
| Add a TODO | `TODO.md` |
| Plan a feature | `agent-instructions/plans/` |
| Read human docs | `docs/` or `README.md` |

## Project Overview

Warehouse is an inventory management system for GE appliance dealers. It syncs data from GE DMS (Dealer Management System), tracks loads (shipments of ~60 appliances on semi trucks), and provides barcode scanning for verification.

## Architecture

- **Frontend**: React + Vite, deployed to Netlify
- **Backend**: ge-sync service (Node.js + Playwright), deployed to Railway
- **Database**: Supabase (PostgreSQL + Realtime)

## Key Terminology

- **Load**: A shipment of ~60 GE appliances on a semi truck (not a pallet)
- **ASIS**: "As-Is" inventory - open-box/damaged items sold at discount
- **GE DMS**: GE's Dealer Management System - source of truth for inventory
- **ge-sync**: Backend service that syncs GE DMS data to Supabase

## CLI Tools

This project has linked CLIs: **Supabase, Netlify, Railway, psql**

**Before first use, ask:** "Can I use the [tool] CLI to [action]?"

**If a CLI fails:** Tell the user, ask them to fix it, wait for confirmation. Do not work around with curl/REST APIs.

See `agent-instructions/cli-tools.md` for full documentation.

## Git Commits

Use **Conventional Commits**:

```
type(scope): description

# Types: feat, fix, docs, style, refactor, test, chore
```

Examples:
- `feat(sync): add retry logic for GE auth`
- `fix(scanner): handle missing serial numbers`

## Don't

- Don't run `npm run dev` unless explicitly asked
- Don't create documentation files unless explicitly asked
- Don't use Claude mentions in commit messages
- Don't work around CLI failures with scripts or REST APIs

## File Organization

```
CLAUDE.md                 # You are here - agent entry point
README.md                 # Human project documentation
TODO.md                   # Project todos

agent-instructions/       # Detailed agent docs
├── index.md              # Index and routing guide
├── cli-tools.md          # CLI documentation
└── plans/                # Feature planning docs

docs/                     # Human documentation
└── auth.md               # Auth implementation

research/                 # Research artifacts
services/                 # Service-specific docs
```
