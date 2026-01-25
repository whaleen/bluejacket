# Agent Instructions Index

This folder contains detailed documentation for AI agents working on this codebase.

## When to Read What

| File | Read when... |
|------|--------------|
| `cli-tools.md` | Using Supabase, Netlify, Railway, or psql CLIs |
| `plans/floor-display.md` | Working on floor display feature |
| `plans/saas-feasibility.md` | Planning multi-tenant SaaS features |

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

## Important Notes

- Always check `CLAUDE.md` first - it's the entry point
- CLI tools are the preferred interface - don't write workaround scripts
- Ask before using a CLI for the first time in a session
