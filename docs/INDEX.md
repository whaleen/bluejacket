# Documentation Index

**Last Updated:** 2026-02-07

## 🟢 Current & Accurate

### State Management (NEW - Phase 1 & 2 Complete)
- **[REALTIME-SYNC.md](./REALTIME-SYNC.md)** - Phase 1: Realtime subscriptions & automatic sync
- **[PHASE-2-COMPLETE.md](./PHASE-2-COMPLETE.md)** - Phase 2: Zustand store & optimistic updates
- **[OPTIMISTIC-UPDATES-USAGE.md](./OPTIMISTIC-UPDATES-USAGE.md)** - How to use the new hooks
- **[GE-SYNC-DATA-FLOW.md](./GE-SYNC-DATA-FLOW.md)** - Complete GE sync coverage

### Architecture
- **[architecture/auth.md](./architecture/auth.md)** - Authentication system
- **[architecture/product-lifecycle.md](./architecture/product-lifecycle.md)** - Product lifecycle
- **[architecture/ui-layering.md](./architecture/ui-layering.md)** - UI layer structure
- **[database/DATA_DICTIONARY.md](./database/DATA_DICTIONARY.md)** - Database schema

### Features
- **[features/map.md](./features/map.md)** - Map functionality
- **[features/scanning-sessions.md](./features/scanning-sessions.md)** - Session management
- **[features/ge-scraper.md](./features/ge-scraper.md)** - GE sync service

### Workflows
- **[workflows/finding-items.md](./workflows/finding-items.md)** - How to find items
- **[workflows/scanning-items.md](./workflows/scanning-items.md)** - How to scan items

### Development
- **[faq.md](./faq.md)** - Common questions
- **[README.md](./README.md)** - Project overview

## 🟡 Partially Outdated (Review Before Using)

### Audits (May have outdated info)
- **[REALTIME_UI_AUDIT.md](./REALTIME_UI_AUDIT.md)** - UI audit (pre-Phase 2)
- **[STATE_MANAGEMENT_AUDIT.md](./STATE_MANAGEMENT_AUDIT.md)** - State audit (pre-Phase 2)
- **[LOADING_STATES_AUDIT.md](./LOADING_STATES_AUDIT.md)** - Loading states
- **[SCANNER_MAP_CLEANUP_AUDIT.md](./SCANNER_MAP_CLEANUP_AUDIT.md)** - Scanner/map audit

### Migration Docs (Completed)
- **[features/tanstack-query-migration.md](./features/tanstack-query-migration.md)** - TanStack migration (DONE)

## 🔴 Archive (Historical Reference Only)

### Root Level (Move to docs/archive/)
- **BARCODE_MATCHING_ANALYSIS.md** - Old barcode analysis
- **ASIS_ARCHITECTURE_DIAGRAM.md** - Old ASIS diagram
- **ASIS_CUSTOM_FIELDS_ASSESSMENT.md** - Old assessment
- **BUN_MIGRATION_PLAN.md** - Bun migration (not done)
- **IMPLEMENTATION_SUMMARY.md** - Old implementation notes
- **LOAD_STYLING_AND_PROGRESS_PLAN.md** - Old plan (completed)
- **LOAD_WORK_PROGRESS_COMPLETE.md** - Old completion doc
- **MIGRATION-PLAN.md** - Zustand migration plan (completed)
- **UNIFIED_SYNC_IMPLEMENTATION.md** - Old sync doc
- **TODO.md** - Old todos

### Agent Plans (.agent/plans/)
- Keep as-is for agent reference

## 📁 Recommended Organization

```
docs/
├── INDEX.md (this file)
├── README.md
├── REALTIME-SYNC.md
├── PHASE-2-COMPLETE.md
├── OPTIMISTIC-UPDATES-USAGE.md
├── GE-SYNC-DATA-FLOW.md
├── architecture/
├── database/
├── features/
├── workflows/
└── archive/
    ├── audits/
    ├── old-plans/
    └── completed-migrations/
```

## ✅ Migration Status

### UI Components Migrated:
- ✅ LoadManagementView
- ✅ DashboardView
- ✅ AsisLoadsWidget
- ✅ useOptimisticScan (updated with load store)
- ⚠️  LoadDetailPanel (uses useLoadDetail for items - keep as-is)
- ⚠️  WarehouseMapNew (uses useLoadMetadata - already optimized)

### All New Code Should Use:
```typescript
// For displaying loads
import { useLoadData, useLoadByName } from '@/hooks/useLoadData';

// For scanning items (automatic optimistic updates)
import { useOptimisticScan } from '@/hooks/mutations/useOptimisticScan';
```

## 🎯 Quick Links

**Want to add a feature?** → Start with `architecture/` docs
**Want to fix a bug?** → Check `workflows/` for context
**Want to understand data flow?** → Read `GE-SYNC-DATA-FLOW.md`
**Want to add UI components?** → Read `OPTIMISTIC-UPDATES-USAGE.md`

---

**Note:** This index is maintained manually. Update it when adding/removing docs.
