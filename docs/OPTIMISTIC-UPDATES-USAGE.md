# Optimistic Updates - Usage Guide

## Phase 2 Complete! ✅

You now have instant UI updates with automatic background sync.

## How to Use

### 1. Display Load Data (Always Use This Hook)

```typescript
import { useLoadData, useLoadByName } from '@/hooks/useLoadData';

// Get all loads (instant from Zustand store)
function LoadsList() {
  const { loads, isLoading } = useLoadData({ inventoryType: 'ASIS' });

  return (
    <div>
      {loads.map(load => (
        <div key={load.sub_inventory_name}>
          {load.sub_inventory_name}: {load.items_scanned_count}/{load.items_total_count}
        </div>
      ))}
    </div>
  );
}

// Get single load (instant from Zustand store)
function LoadDetail({ loadName }: { loadName: string }) {
  const { load, isLoading } = useLoadByName(loadName);

  if (!load) return null;

  return (
    <div>
      Scanned: {load.items_scanned_count}/{load.items_total_count}
    </div>
  );
}
```

### 2. Update Data with Optimistic Updates

```typescript
import { optimisticScanItem } from '@/lib/optimisticUpdates';

async function handleScanItem(itemId: string, loadName: string) {
  // Log the scan to product_location_history
  await logProductLocation(itemId, location);

  // Update UI instantly + sync in background
  await optimisticScanItem(loadName);

  // UI updates immediately! ⚡
  // Database trigger updates load_metadata
  // Realtime broadcasts to other users
}
```

### 3. What Happens Under the Hood

```
User Action (scan item)
  ↓
1. Zustand store updates INSTANTLY (UI shows new count)
  ↓
2. Database operation happens in background
  ↓
3. Database trigger updates load_metadata
  ↓
4. Realtime broadcasts change
  ↓
5. RealtimeContext updates Zustand store with server truth
  ↓
6. UI stays in sync (usually already correct from step 1)
```

## Migration Guide

### Before (React Query only):
```typescript
// Old way - slow, manual invalidation
const { data: loads } = useLoads();
await scanItem();
queryClient.invalidateQueries(['loads']); // Manual!
// Wait for refetch... slow ❌
```

### After (Zustand + Optimistic):
```typescript
// New way - instant, automatic sync
const { loads } = useLoadData(); // Zustand store
await optimisticScanItem(loadName); // Instant UI ⚡
// Background sync automatic ✅
```

## Components to Update

Replace these hooks:
- `useLoads()` → `useLoadData()`
- `useLoadDetail()` → `useLoadByName()`
- Manual invalidation → `optimisticScanItem()`

## Benefits

✅ **Instant UI** - Updates appear immediately (no loading spinner)
✅ **Automatic Sync** - Background sync happens automatically
✅ **Multi-User** - Other users see changes via Realtime
✅ **Consistent** - Server always wins if there's a conflict
✅ **Simple API** - Just use `useLoadData()` everywhere

## Advanced: Batch Operations

```typescript
import { optimisticBatchScan } from '@/lib/optimisticUpdates';

// Scan multiple items at once
async function handleBulkScan(items: Item[]) {
  const loadNames = items.map(i => i.sub_inventory).filter(Boolean);

  // All loads update instantly
  await optimisticBatchScan(loadNames);
}
```

## Testing

1. Open app in two browser tabs
2. Scan item in tab 1
3. See instant update in tab 1 (Zustand)
4. See automatic update in tab 2 (Realtime)
5. Both tabs stay perfectly in sync

## Next Steps

Start migrating components one by one:
1. Replace `useLoads()` with `useLoadData()`
2. Replace manual invalidation with `optimisticScanItem()`
3. Test and verify instant updates
4. Repeat for all components

The old hooks still work, so you can migrate gradually.
