# UI Migration Plan - Zustand Store

## Components to Migrate (6 files)

### 1. LoadManagementView.tsx
- [ ] Replace `useLoads()` with `useLoadData()`
- [ ] Remove manual invalidation

### 2. LoadDetailPanel.tsx
- [ ] Replace `useLoadDetail()` with `useLoadByName()`
- [ ] Remove manual invalidation

### 3. DashboardView.tsx
- [ ] Replace `useLoads()` with `useLoadData()`

### 4. AsisLoadsWidget.tsx
- [ ] Replace `useLoads()` with `useLoadData()`

### 5. useOptimisticScan.ts
- [ ] Add `optimisticScanItem()` call to update load store

### 6. WarehouseMapNew.tsx (uses useLoadMetadata)
- [ ] Already uses map metadata, verify it uses store

## Migration Steps

**Step 1:** Update useOptimisticScan to include load store updates
**Step 2:** Migrate LoadManagementView
**Step 3:** Migrate LoadDetailPanel
**Step 4:** Migrate Dashboard + Widget
**Step 5:** Test everything
**Step 6:** Remove old hooks (deprecate)
**Step 7:** Clean up docs

## Doc Cleanup

Find all markdown files and categorize:
- Keep: Current, accurate docs
- Archive: Outdated but historical
- Delete: Wrong/obsolete

---

# Execution Plan

I'll migrate components one-by-one, testing each, then clean up docs.
