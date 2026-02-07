# Barcode Matching Failure Analysis

## The Problem
All Friday scans are showing as "?" markers because `findItemOwningSession()` is returning "not_found" for items that DO exist in the inventory_items table.

## Root Cause (Most Likely)

**Case Sensitivity in SQL Query**

In `src/lib/sessionScanner.ts` line 82:
```typescript
.or(`serial.eq.${trimmedBarcode},cso.eq.${trimmedBarcode},model.eq.${trimmedBarcode}`)
```

The `.eq.` operator in Supabase/PostgREST is **case-sensitive** by default. This means:
- If barcode scanner returns: `"ABC123"`
- But database has: `"abc123"`
- **Result: No match** ❌

This is almost certainly why all the Friday scans failed - the barcode scanner likely returns uppercase strings, but the database stores them differently.

## Other Potential Issues

1. **Whitespace**: Database values might have trailing spaces
2. **Format differences**: Hyphens, spaces within the barcode
3. **Data type**: Numeric vs string comparison

## The Fix

Change line 82 to use case-insensitive matching:

```typescript
// Current (case-sensitive - WRONG)
.or(`serial.eq.${trimmedBarcode},cso.eq.${trimmedBarcode},model.eq.${trimmedBarcode}`)

// Fixed (case-insensitive - CORRECT)
.or(`serial.ilike.${trimmedBarcode},cso.ilike.${trimmedBarcode},model.ilike.${trimmedBarcode}`)
```

The `.ilike` operator performs case-insensitive matching in PostgreSQL.

## Testing Plan

1. Run `diagnose_barcode_matching.sql` to confirm case mismatch
2. Apply the fix to sessionScanner.ts
3. Test with a known failed barcode
4. Verify map markers now show correct inventory_type

## Data Recovery

After fixing the query, the existing "Review" markers won't automatically fix themselves. We have two options:

1. **Delete and rescan**: Clear the bad markers and rescan the items
2. **Backfill**: Run a SQL update to match existing "Review" markers to their correct inventory_item_id

I recommend option 1 (delete and rescan) since you're not at the warehouse now anyway.
