# Inventory Counting

## Overview
This doc explains how inventory counts work and why the map and ASIS page must use the same data source.

## The Problem (Feb 2026)
Map inventory panel and ASIS page were showing different counts because they used different data sources. This caused weeks of confusion and broken counts.

## The Solution
**Both the map and ASIS page now query `load_metadata` table directly.**

### Data Source: `load_metadata` table
These fields are the source of truth for load counts:
- `items_total_count` - Total items in the load
- `items_scanned_count` - Number of items that have been scanned
- `scanning_complete` - Boolean flag when all items scanned

### Where These Are Used
1. **ASIS Page** (`LoadManagementView.tsx`): Uses `items_total_count` directly
2. **Map Inventory Panel** (`useInventoryScanCounts()` in `useMap.ts`): Queries same fields

### How They're Populated
Migration `20260207120000_actually_add_work_progress_fields.sql` calculates and updates these fields by:
1. Joining `load_metadata` with `inventory_items` on `sub_inventory_name`
2. Joining with `product_location_history` for scan counts
3. Matching by `inventory_type` (ASIS loads count ASIS items, etc.)

## ASIS vs STA

### What They Are
- **ASIS**: "As-Is" inventory bucket from GE (damaged/returned items)
- **STA**: "Staged" inventory bucket from GE 

### Key Facts
- Both are **separate buckets from GE**, not duplicates
- Both include load assignments (`sub_inventory`)
- The migration handles any deduplication - don't try to do it manually

### What NOT to Do
❌ Don't create complex RPC functions with ASIS/STA deduplication logic
❌ Don't try to deduplicate across the entire location
❌ Don't assume ASIS and STA need special handling

✅ Just query `load_metadata` fields - the migration handles everything

## Code References

### Map Inventory Panel
```typescript
// src/hooks/queries/useMap.ts - useInventoryScanCounts()
const { data: loads } = await supabase
  .from('load_metadata')
  .select('sub_inventory_name, items_total_count, items_scanned_count')
  .eq('location_id', locationId);
```

### ASIS Page
```typescript
// src/components/Inventory/LoadManagementView.tsx
const loads: LoadWithCount[] = loadsSource.map(load => ({
  ...load,
  item_count: load.items_total_count || 0,
}));
```

## Migration
See: `supabase/migrations/20260207120000_actually_add_work_progress_fields.sql`

This migration:
1. Adds the count fields to `load_metadata`
2. Recalculates counts for all existing loads
3. Joins by `location_id`, `inventory_type`, and `sub_inventory_name`

## Troubleshooting

### Counts are wrong/missing
1. Check if migration has run: Look for `items_total_count` column in `load_metadata`
2. Verify items have `sub_inventory` set: Query `inventory_items` table
3. Re-run migration if needed to recalculate counts

### Map and ASIS page show different numbers
**This should never happen anymore.** Both use the same source. If it does:
1. Check that both are querying `load_metadata` table
2. Verify the query key version matches (currently `v5` in `useInventoryScanCounts`)
3. Hard refresh browser to clear React Query cache

### Data Quality Dashboard shows different numbers
The Data Quality Dashboard uses `product_location_history` for scan counts (different from load counts). This is correct - it validates scan accuracy, not load counts.
