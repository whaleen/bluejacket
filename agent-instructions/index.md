# Agent Instructions Index

This folder contains detailed documentation for AI agents working on this codebase.

## When to Read What

| File | Read when... |
|------|--------------|
| `cli-tools.md` | Using Supabase, Netlify, Railway, or psql CLIs |
| `plans/floor-display.md` | Working on floor display feature |
| `plans/saas-feasibility.md` | Planning multi-tenant SaaS features |
| `../services/ge-sync/docs/EXPLORATION_GUIDE.md` | Exploring GE DMS system or running browser automation |
| `../services/ge-sync/docs/GE_DMS_PAGES.md` | Looking up GE DMS page details, exports, or workflows |
| `../services/ge-sync/docs/GE_DMS_SYSTEM_OVERVIEW.md` | Understanding GE DMS business processes and terminology |

## Where to Add Things

| Task | Location |
|------|----------|
| New TODO items | `/TODO.md` (project root) |
| New feature plans | `agent-instructions/plans/` |
| CLI tool documentation | `agent-instructions/cli-tools.md` |
| Human-facing docs | `docs/` |

## File Purposes

### cli-tools.md
Complete documentation for CLI tools available in this project:
- Supabase CLI (migrations, inspections, type generation)
- psql (arbitrary SQL queries)
- Netlify CLI (deployments, env vars)
- Railway CLI (ge-sync service management)

### plans/
Feature planning and feasibility documents. These are detailed analysis documents that may be fed to agents when working on specific features.

**Do not read these unless specifically working on that feature.**

### GE DMS Documentation (`services/ge-sync/docs/`)

**EXPLORATION_GUIDE.md** - Complete guide for exploring GE DMS system safely
- Prerequisites and credential setup
- Browser automation scripts usage
- When to pause and ask for approval
- Production safety rules
- Common issues and solutions

**GE_DMS_PAGES.md** - Complete catalog of 30 documented GE DMS pages
- Page URLs, purposes, and types
- Export capabilities (8 pages with data exports)
- Field listings and filters
- Workflow vs data distinction

**GE_DMS_SYSTEM_OVERVIEW.md** - Business processes and terminology
- Glossary of 40+ GE terms (MS#, CSO, POD, RA, ASN, etc.)
- 8 detailed business workflows
- Daily operation timeline
- System pain points

**Read these docs BEFORE exploring GE DMS to avoid repeating credential/auth issues.**

## Important Notes

- Always check `CLAUDE.md` first - it's the entry point
- CLI tools are the preferred interface - don't write workaround scripts
- Ask before using a CLI for the first time in a session
