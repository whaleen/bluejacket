# GE DMS Research (Condensed)

This folder now contains only the minimal reference docs used to build the GE sync service.

## What’s kept

- `docs/GE-DMS-ENDPOINTS.md` – canonical list of discovered endpoints and notes.

## Where the real sync lives

The working implementation is in `services/ge-sync` (Playwright auth + GE export fetch + Supabase writes).
Any new research should live in the service or a short addendum to `GE-DMS-ENDPOINTS.md`.
