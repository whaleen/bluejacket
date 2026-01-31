# Warehouse - Agent Instructions

## Quick Reference

| Need to... | Go to... |
|------------|----------|
| Use CLI tools | `.agent/cli-tools.md` |
| Explore GE DMS system | `services/ge-sync/docs/EXPLORATION_GUIDE.md` |
| Look up GE DMS pages | `services/ge-sync/docs/GE_DMS_PAGES.md` |
| Understand GE workflows | `services/ge-sync/docs/GE_DMS_SYSTEM_OVERVIEW.md` |
| Setup GE sync secrets | `services/ge-sync/docs/SECRETS.md` |
| Plan a feature | `.agent/plans/` |
| Review session notes | `.agent/sessions/` |
| Add a TODO | `TODO.md` |
| Read human docs | `docs/README.md` (index) |

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

See `.agent/cli-tools.md` for full documentation.

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

## Documentation Organization

### Agent Documentation (`.agent/`)
- **cli-tools.md** - Supabase, Netlify, Railway, psql CLIs
- **plans/** - Feature planning docs (floor-display, saas-feasibility)
- **sessions/** - Ephemeral exploration/session notes

### Human Documentation (`docs/`)
- **README.md** - Index of all human documentation
- **architecture/** - System architecture, auth, endpoints
- **database/** - Schema, data dictionary
- **features/** - Feature-specific docs (map, scanner, scraper)
- **sync-service/** - GE sync implementation notes

### Service Documentation (`services/ge-sync/docs/`)
- **EXPLORATION_GUIDE.md** - How to explore GE DMS safely
- **GE_DMS_PAGES.md** - Complete page catalog (30 pages)
- **GE_DMS_SYSTEM_OVERVIEW.md** - Business processes and terminology
- **GE_ENDPOINT_FIELDS.md** - Field mappings for sync endpoints
- **SECRETS.md** - Complete secrets setup guide (local, deployed, exploration)

### Project Root
```
AGENT.md                  # You are here - agent entry point
README.md                 # Human project overview
TODO.md                   # Project todos
.agent/                   # Agent-specific documentation
docs/                     # Human documentation (organized by category)
services/                 # Service-specific docs and code
```
