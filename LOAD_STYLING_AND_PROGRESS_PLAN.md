# Unified Load Styling & Work Progress Implementation Plan

## Project Overview

Standardize load display across all views with consistent styling, comprehensive progress tracking, and refined action items. Implement sanity check workflow for physical load verification.

## Current State Analysis

### Where Loads Are Currently Displayed

1. **Load Cards** - `LoadDetailPanel.tsx`, `LoadManagementView.tsx`
2. **Action Items** - `DashboardView.tsx` (ASIS action loads)
3. **Inventory Map Sidebar** - `WarehouseMapNew.tsx` (sidebar with load info)
4. **Map Markers** - `WarehouseMapNew.tsx` (popover data)

### Existing Load Fields (from `LoadMetadata` type)

**GE-Sourced Fields:**
- `ge_source_status` - GE load status
- `ge_cso_status` - CSO status from GE
- `ge_cso` - Customer/CSO identifier
- `ge_inv_org` - Inventory organization
- `ge_units` - Number of units
- `ge_load_number` - GE load number
- `ge_notes` - Notes from GE
- `ge_submitted_date` - When submitted to GE

**Custom Fields (Existing):**
- `prep_tagged` - Whether items are tagged
- `prep_wrapped` - Whether items are wrapped
- `sanity_check_requested` - Sanity check has been requested
- `sanity_completed_at` - When sanity check was completed
- `sanity_completed_by` - Who completed the check
- `friendly_name` - User-friendly load name
- `primary_color` - Load color for visual identification
- `pickup_date` - Scheduled pickup
- `status` - Load status (active, staged, in_transit, delivered)
- `notes` - Custom notes

### Fields We Need to Add

1. **Scanning Progress**
   - `items_scanned_count` - How many items have been scanned/mapped
   - `items_total_count` - Total items in load
   - `scanning_complete` - Boolean: all items scanned

2. **Sanity Check Enhancement**
   - `sanity_check_stage` - 'early' | 'final' | null
   - `sanity_check_parameters` - JSON: what needs to be verified
   - `sanity_last_checked_at` - Timestamp of last check
   - `sanity_last_checked_by` - Who performed last check

3. **Derived/Computed Fields** (can be calculated from other data)
   - Wrapping required (based on GE status)
   - Tagging required (based on GE status - sold loads)
   - Expected sanity parameters (based on load lifecycle stage)

## Implementation Phases

### Phase 1: Create Unified Load Display Component ✅

**Goal**: Single source of truth for load visual representation

**Files to Create**:
- `src/components/Loads/LoadDisplay.tsx` - Main unified component
- `src/components/Loads/LoadBadge.tsx` - Load status badge
- `src/components/Loads/LoadProgressBar.tsx` - Work progress visualization
- `src/components/Loads/LoadColorIndicator.tsx` - Color bucket display
- `src/lib/loadDisplay.ts` - Styling utilities and constants

**Component Features**:
```tsx
<LoadDisplay
  load={loadMetadata}
  variant="card" | "compact" | "sidebar" | "marker"
  showProgress={true}
  showCSO={true}
  showActions={true}
  onEdit={() => navigateToLoadEditor()}
/>
```

**Visual Elements** (all variants should include):
- Load color indicator (primary_color)
- Load number (sub_inventory_name or friendly_name)
- CSO (if applicable)
- GE status badge
- Work progress indicators:
  - Tagged (✓ if complete, pending if required)
  - Wrapped (✓ if complete, pending if required)
  - Scanned/Mapped (X/Y items, percentage)
  - Sanity Check (✓ last checked, ⚠ requested, ⊘ not requested)

### Phase 2: Update Database Schema ✅

**Migration**: Add new fields to `load_metadata` table

```sql
-- Add scanning progress fields
ALTER TABLE load_metadata
  ADD COLUMN items_scanned_count INTEGER DEFAULT 0,
  ADD COLUMN items_total_count INTEGER DEFAULT 0,
  ADD COLUMN scanning_complete BOOLEAN DEFAULT FALSE;

-- Add enhanced sanity check fields
ALTER TABLE load_metadata
  ADD COLUMN sanity_check_stage TEXT CHECK (sanity_check_stage IN ('early', 'final')),
  ADD COLUMN sanity_check_parameters JSONB,
  ADD COLUMN sanity_last_checked_at TIMESTAMPTZ,
  ADD COLUMN sanity_last_checked_by TEXT;

-- Add index for querying loads needing attention
CREATE INDEX idx_load_metadata_work_status
  ON load_metadata(inventory_type, prep_tagged, prep_wrapped, scanning_complete, sanity_check_requested);
```

**Update TypeScript Types**:
```typescript
// src/types/inventory.ts
export interface LoadMetadata {
  // ... existing fields ...

  // Scanning progress
  items_scanned_count?: number;
  items_total_count?: number;
  scanning_complete?: boolean;

  // Enhanced sanity checks
  sanity_check_stage?: 'early' | 'final' | null;
  sanity_check_parameters?: SanityCheckParameters;
  sanity_last_checked_at?: string | null;
  sanity_last_checked_by?: string | null;
}

export interface SanityCheckParameters {
  checkGrouping: boolean;
  checkWrapping: boolean;
  checkTagging: boolean;
  checkEndCapMarkers: boolean;
  checkNoExtraItems: boolean;
  checkVisuallyLocatable: boolean;
  geStatus?: string; // For reference
  notes?: string;
}
```

### Phase 3: Implement Sanity Check System ✅

**Goal**: Physical verification workflow with stage-appropriate parameters

**Files to Create**:
- `src/components/Loads/SanityCheckDialog.tsx` - Request/complete sanity check
- `src/lib/sanityCheck.ts` - Business logic for parameters
- `src/hooks/mutations/useSanityCheck.ts` - Mutations for sanity operations

**Sanity Check Lifecycle**:

1. **Early Stage Check** (when load first appears in GE)
   - Parameters to verify:
     - ✓ All items grouped together
     - ✓ All items match GE inventory list
     - ✓ No out-of-place items
     - ⊘ Wrapping not required yet
     - ⊘ Tagging not required yet

2. **Final Stage Check** (after shipped/sold in GE)
   - Parameters to verify:
     - ✓ All items grouped together
     - ✓ Wrapping complete (if required)
     - ✓ Tagging complete (if required - sold loads only)
     - ✓ End cap markers in place (if tagged)
     - ✓ All items ready for pickup
     - ✓ Visually locatable without confusion

**Business Logic** (`src/lib/sanityCheck.ts`):
```typescript
export function getSanityCheckParameters(load: LoadMetadata): SanityCheckParameters {
  const geStatus = load.ge_source_status?.toLowerCase() || '';
  const isSold = geStatus.includes('sold');
  const isShipped = geStatus.includes('shipped');

  // Early stage: just verify grouping
  if (!isShipped && !isSold) {
    return {
      checkGrouping: true,
      checkWrapping: false,
      checkTagging: false,
      checkEndCapMarkers: false,
      checkNoExtraItems: true,
      checkVisuallyLocatable: true,
      geStatus,
      notes: 'Early consolidation check: verify items are grouped and match GE inventory',
    };
  }

  // Final stage: verify everything
  return {
    checkGrouping: true,
    checkWrapping: isShipped || isSold,
    checkTagging: isSold,
    checkEndCapMarkers: isSold && load.prep_tagged === true,
    checkNoExtraItems: true,
    checkVisuallyLocatable: true,
    geStatus,
    notes: 'Final readiness check: verify load is fully prepared for pickup',
  };
}

export function canRequestSanityCheck(load: LoadMetadata): boolean {
  // Can request if:
  // 1. Not already requested (or last check was > 24 hours ago)
  // 2. Load has items
  // 3. Load is not delivered

  if (load.status === 'delivered') return false;
  if (!load.ge_units || load.ge_units === '0') return false;

  if (load.sanity_check_requested && !load.sanity_completed_at) {
    // Already have pending request
    return false;
  }

  // Can always request a fresh check
  return true;
}
```

### Phase 4: Refine Action Items ✅

**Goal**: Isolated, precise action items with better filtering

**Current Issues**:
- May include delivered loads (shouldn't - not in building)
- Action items are broad (e.g., "needs prep")
- No clear breakdown by prep type

**New Action Item Types**:
1. **Wrapping Needed** - Load is shipped/sold but `prep_wrapped = false`
2. **Tagging Needed** - Load is sold but `prep_tagged = false`
3. **Sanity Check Requested** - `sanity_check_requested = true` and `sanity_completed_at IS NULL`
4. **Needs Scanning** - `scanning_complete = false` or items unmapped
5. **Pickup Soon** - `pickup_date` within next 48 hours and any prep incomplete

**Filter Out**:
- Loads with `status = 'delivered'`
- Loads that have left the building

**Files to Update**:
- `src/components/Dashboard/DashboardView.tsx` - Refine action load queries
- `src/hooks/queries/useActionItems.ts` (create) - Dedicated hook for action items

**New Query Structure**:
```typescript
// Get loads needing wrapping
const loadsNeedingWrap = await supabase
  .from('load_metadata')
  .select('*')
  .eq('location_id', locationId)
  .eq('inventory_type', 'ASIS')
  .neq('status', 'delivered')
  .eq('prep_wrapped', false)
  .or('ge_source_status.ilike.%shipped%,ge_source_status.ilike.%sold%');

// Get loads needing tagging
const loadsNeedingTags = await supabase
  .from('load_metadata')
  .select('*')
  .eq('location_id', locationId)
  .eq('inventory_type', 'ASIS')
  .neq('status', 'delivered')
  .eq('prep_tagged', false)
  .ilike('ge_source_status', '%sold%');

// Get loads with pending sanity checks
const loadsNeedingSanityCheck = await supabase
  .from('load_metadata')
  .select('*')
  .eq('location_id', locationId)
  .neq('status', 'delivered')
  .eq('sanity_check_requested', true)
  .is('sanity_completed_at', null);
```

### Phase 5: Update All Load Display Locations ✅

**Goal**: Replace all load displays with unified component

**Files to Update**:

1. **Load Management View**
   - File: `src/components/Inventory/LoadManagementView.tsx`
   - Replace: Custom load cards
   - With: `<LoadDisplay variant="card" />`

2. **Dashboard Action Items**
   - File: `src/components/Dashboard/DashboardView.tsx`
   - Replace: Current action load display
   - With: `<LoadDisplay variant="compact" showActions={true} />`

3. **Map Sidebar**
   - File: `src/components/Map/WarehouseMapNew.tsx`
   - Replace: Sidebar load info
   - With: `<LoadDisplay variant="sidebar" />`

4. **Map Markers Popover**
   - File: `src/components/Map/WarehouseMapNew.tsx`
   - Replace: Popover content
   - With: `<LoadDisplay variant="marker" />`

5. **Load Detail Panel**
   - File: `src/components/Inventory/LoadDetailPanel.tsx`
   - Update: Add LoadDisplay header
   - Add: Sanity check controls
   - Add: Scanning progress display

### Phase 6: Scanning Progress Tracking ✅

**Goal**: Automatically track scanning/mapping progress per load

**Approach**: Update counts when items are scanned/mapped

**Files to Update**:
- `src/lib/mapManager.ts` - Update counts when logging location
- `src/lib/sessionScanner.ts` - Update counts when scanning

**Logic**:
```typescript
// After successful scan/map
async function updateLoadScanningProgress(loadName: string) {
  const { locationId } = getActiveLocationContext();

  // Get total items in load
  const { count: totalCount } = await supabase
    .from('inventory_items')
    .select('*', { count: 'exact', head: true })
    .eq('location_id', locationId)
    .eq('sub_inventory', loadName);

  // Get scanned items (have location history)
  const { data: scannedItems } = await supabase
    .from('inventory_items')
    .select('id')
    .eq('location_id', locationId)
    .eq('sub_inventory', loadName)
    .not('id', 'is', null)
    .in('id',
      supabase
        .from('product_location_history')
        .select('inventory_item_id')
        .eq('location_id', locationId)
    );

  const scannedCount = scannedItems?.length || 0;

  // Update load metadata
  await supabase
    .from('load_metadata')
    .update({
      items_scanned_count: scannedCount,
      items_total_count: totalCount || 0,
      scanning_complete: scannedCount === totalCount && totalCount > 0,
    })
    .eq('location_id', locationId)
    .eq('sub_inventory_name', loadName);
}
```

## Visual Design Guidelines

### Load Color Indicator
- **Size**: 12px × 12px circle (compact), 16px × 16px (card/sidebar)
- **Position**: Leading element, before load name
- **Border**: 2px solid white (for contrast)
- **Default**: Gray if no color assigned

### Load Name Display
- **Format**: `friendly_name` (if set) or `sub_inventory_name`
- **Font**: Medium weight, 14px (compact), 16px (card)
- **Truncate**: Max 30 characters with ellipsis

### CSO Display
- **Format**: "CSO: {ge_cso}"
- **Style**: Badge, outline variant
- **Color**: Muted
- **Position**: After load name

### Status Badge
- **Values**:
  - "For Sale" (ge_source_status contains "for sale")
  - "Shipped" (contains "shipped")
  - "Sold" (contains "sold")
  - "Picked" (contains "picked")
- **Colors**:
  - For Sale: Blue
  - Shipped: Purple
  - Sold: Green
  - Picked: Orange

### Work Progress Indicators

Display as grid of status items:

```
[✓] Tagged          [85%] Scanned
[✓] Wrapped         [!] Sanity Check
```

**States**:
- ✓ Green - Complete
- ⊘ Gray - Not required yet
- ⚠ Yellow - Required but pending
- ! Red - Attention needed (sanity check requested)

### Variant Differences

**Card** (full detail):
- All elements visible
- Progress bars for scanning
- Full CSO and notes display
- Edit button prominent

**Compact** (action items):
- Essential info only
- Load name, color, status
- Critical progress indicators
- Quick action button

**Sidebar** (map context):
- Medium detail
- Map-specific actions (zoom to load)
- Scanning progress prominent
- Item count

**Marker** (popover):
- Minimal
- Load name and color
- Item count
- "View Details" link

## Testing Strategy

### Unit Tests
- Load display component rendering
- Sanity check parameter calculation
- Progress calculation logic

### Integration Tests
- Scanning updates progress counts
- Sanity check workflow (request → complete)
- Action item filtering excludes delivered loads

### Manual Testing Checklist
1. [ ] Load displays consistently across all 4 locations
2. [ ] CSO shows when present, hidden when null
3. [ ] Color indicators match primary_color
4. [ ] Progress accurately reflects prep status
5. [ ] Sanity check parameters update based on GE status
6. [ ] Early stage sanity check doesn't require wrap/tag
7. [ ] Final stage sanity check requires all prep
8. [ ] Delivered loads don't appear in action items
9. [ ] Scanning progress updates after mapping items
10. [ ] Edit buttons navigate to load editor correctly

## Migration Plan

1. **Phase 1**: Create LoadDisplay component (can coexist with old displays)
2. **Phase 2**: Run database migration (add new columns)
3. **Phase 3**: Update one location at a time:
   - Start with Dashboard (least critical)
   - Then Map Sidebar
   - Then Map Markers
   - Finally Load Management (most complex)
4. **Phase 4**: Remove old display code once all migrated
5. **Phase 5**: Monitor for issues, adjust styling

## Open Questions

1. **Visual Guidelines**: Do we have specific brand colors or should I infer from existing UI?
2. **Sanity Check Assignment**: Who can complete sanity checks? Any user or specific roles?
3. **Scanning Progress**: Should it also count items that are in `scanning_sessions` as scanned?
4. **Load Editor Navigation**: Is there a standard pattern for navigating to load detail?
5. **End Cap Markers**: Are these tracked separately or part of `prep_tagged`?

## Next Steps

Please review this plan and let me know:
1. Any adjustments to the phasing or approach
2. Answers to open questions
3. Which phase you'd like me to start with
4. Any missing requirements or considerations
