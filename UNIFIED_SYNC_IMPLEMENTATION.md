# Unified Inventory Sync Implementation

## What Changed

### 1. Backend: New `/sync/inventory` Endpoint
**File**: `services/ge-sync/src/index.ts`

- New endpoint that runs **FG → ASIS → STA** in the correct order
- Guarantees no sync ordering issues
- Combines stats from all three syncs
- Handles errors gracefully (continues even if one sync fails)
- Returns detailed results for each sync type

**Benefits**:
- ✅ Correct order guaranteed (prevents ASIS/STA conflicts)
- ✅ ASIS→STA migration works properly
- ✅ Single button click for complete sync
- ✅ Combined statistics for reporting

### 2. Frontend: New "Sync All Inventory" Button
**File**: `src/components/Settings/GESyncView.tsx`

- Added unified sync button at the top (recommended)
- Individual sync buttons moved below with warning
- Clear explanation of what each inventory type is
- Better UX with visual hierarchy

### 3. Type Updates
**Files**:
- `services/ge-sync/src/types/index.ts` - Added `item_migrated` change type
- `src/lib/geSync.ts` - Added `inventory` to `GeSyncType`

### 4. Session Creation
**File**: `src/hooks/queries/useGeSync.ts`

- Updated to create sessions for all three types when using unified sync
- Individual syncs still work as before

## How to Use

### Recommended Approach (Unified Sync)
1. Go to **Settings → GE Sync**
2. Click **"Sync All Inventory"** button
3. Wait for completion (may take 2-5 minutes depending on inventory size)

This will:
1. Sync FG (Finished Goods)
2. Sync ASIS (For Sale inventory)
3. Sync STA (Staged inventory) - migrating ASIS→STA as needed
4. Create sessions for all loads
5. Invalidate and refresh all inventory queries

### Individual Syncs (Advanced)
Individual sync buttons are still available but should only be used if you need to sync a specific inventory type. **Warning**: Running in the wrong order may cause data inconsistencies.

## Current Performance

**STA Sync Example** (from your recent run):
- 619 items processed in **135 seconds** (~2.25 minutes)
- 164 ASIS→STA migrations
- 1,207 changes logged

**Unified Sync Estimate**:
- FG: ~30-60s
- ASIS: ~60-120s (more complex, has loads)
- STA: ~60-135s
- **Total: ~3-5 minutes** for full sync

## Future Performance Optimizations

### High Impact (Would reduce sync time by ~50%)

1. **Batch Change Logging**
   - Current: Each change is an individual database INSERT
   - Proposed: Collect all changes, insert in single batch at end
   - Impact: 1,207 individual writes → 1 batch write
   - **Effort**: Medium (refactor change logging in inventory.ts and asis.ts)

2. **Shared Product Lookup**
   - Current: Each sync fetches all products separately (3 queries)
   - Proposed: Fetch once, share across all three syncs
   - Impact: 3 product table scans → 1 product table scan
   - **Effort**: Medium (pass productLookup as parameter)

3. **Parallel Independent Syncs**
   - Current: FG → ASIS → STA (sequential)
   - Proposed: FG + ASIS in parallel → STA
   - Impact: ~30-50% faster
   - **Effort**: Low (just run FG and ASIS in Promise.all)

### Medium Impact

4. **Reduce Individual Database Queries**
   - Some sync operations do many small queries
   - Could be batched or combined with JOINs
   - **Effort**: High (requires analysis of query patterns)

5. **Optimize Orphan Detection**
   - Current: Fetches all existing items, builds maps, finds orphans
   - Could use SQL to find orphans directly
   - **Effort**: Medium

### Low Impact (Nice to Have)

6. **Progress Streaming**
   - Show real-time progress in UI (using WebSockets or SSE)
   - Better UX but doesn't improve speed
   - **Effort**: High

7. **Caching Cookie Authentication**
   - Auth cookies are already cached, but could optimize refresh logic
   - **Effort**: Low

## Implementation Priority

If you want to optimize performance next, I recommend:

**Phase 1 (Quick Wins - 1-2 hours)**:
1. Run FG and ASIS in parallel (easy change, good impact)
2. Add batch change logging (medium effort, high impact)

**Phase 2 (Bigger Refactor - 4-6 hours)**:
1. Shared product lookup across syncs
2. Optimize orphan detection with SQL

**Expected Result After Phase 1**:
- Sync time: **3-5 minutes → 1.5-2.5 minutes** (~50% faster)

## Testing the Unified Sync

1. Restart the sync service:
   ```bash
   cd services/ge-sync
   npm run dev
   ```

2. In the UI, go to **Settings → GE Sync**

3. Click **"Sync All Inventory"**

4. Watch the server console for detailed logs:
   ```
   ============================================================
   🚀 STARTING UNIFIED INVENTORY SYNC
   ============================================================
   Order: FG → ASIS → STA

   📦 [1/3] Syncing FG (Finished Goods)...
   ✅ FG sync completed: X new, Y updated

   🏪 [2/3] Syncing ASIS (For Sale inventory)...
   ✅ ASIS sync completed: X new, Y updated

   🎯 [3/3] Syncing STA (Staged inventory)...
   [STA] Deleting X ASIS items to migrate to STA...
   ✅ STA sync completed: X new, Y updated

   ============================================================
   ✨ UNIFIED INVENTORY SYNC COMPLETE
   ============================================================
   ```

## What's Fixed

✅ **Sync ordering issues** - No more conflicts from running syncs in wrong order
✅ **ASIS→STA migration** - Items automatically transition when sold
✅ **Duplicate serial handling** - Deduplication prevents PostgreSQL errors
✅ **Data consistency** - GE is single source of truth
✅ **Better UX** - One button for complete sync

## What's Next

- Test the unified sync with your production data
- Monitor performance and identify bottlenecks
- Implement Phase 1 optimizations if speed is an issue
- Consider removing individual sync buttons once you're confident in the unified approach
