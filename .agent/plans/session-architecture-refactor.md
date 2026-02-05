# Session Architecture Refactor - Remaining Work

## Context

Manual session creation is being sunsetted. Sessions should be derived from GE loads/buckets or system buckets (Ad-hoc, Fog of War). Daily GE syncs provide fresh ownership, so historical backfill is not required.

## Remaining Tasks

1. Confirm bucket coverage from GE sync
   - Current auto-created sessions: ASIS loads + FG + STA + BackHaul.
   - Evaluate whether sessions should exist for `Staged`, `Inbound`, `LocalStock`, `Parts`, `WillCall` (requires sync service study).

## Done (since last revision)

- Manual session creation removed (legacy/manual sessions to be fully removed).
- Delivered ASIS loads hidden from SessionsView.

## Open Questions

- Which additional buckets (if any) should create sessions beyond ASIS/FG/STA/BackHaul?
