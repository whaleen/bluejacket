# Scanner and Map Component Cleanup Audit

**Date**: 2026-02-06
**Status**: Analysis Complete - Awaiting Cleanup Approval

---

## Executive Summary

**Current State**: Multiple scanner and map implementations with some unused/redundant code
**Recommendation**: Remove 1 unused component, keep the rest (all are actively used)

---

## Map Components Analysis

### ✅ KEEP - Active Components

#### 1. `WarehouseMapNew.tsx` (PRIMARY MAP)
- **Status**: ✅ ACTIVELY USED
- **Used by**: MapView.tsx, MapOverlay.tsx
- **Purpose**: Main map implementation with MapLibre
- **Features**:
  - GPS position tracking
  - Scanner integration (MinimalScanOverlay, BarcodeScanner)
  - Session management
  - Load visualization
  - Fog of war mode
- **Recent Changes**: Scanner input fixes (2026-02-06)
- **Action**: **KEEP** - This is the main map component

#### 2. `MapView.tsx` (ROUTE WRAPPER)
- **Status**: ✅ ACTIVELY USED
- **Used by**: App.tsx (lazy loaded as route)
- **Purpose**: Route-level wrapper for WarehouseMapNew
- **Features**:
  - Provides AppHeader and PageContainer
  - Desktop vs mobile layout switching
- **Action**: **KEEP** - Required for routing

#### 3. `MapOverlay.tsx` (MOBILE OVERLAY)
- **Status**: ❌ NOT USED
- **Used by**: Nothing (grep found no imports)
- **Purpose**: Mobile overlay wrapper for WarehouseMapNew
- **Analysis**: Appears to be leftover from old architecture
- **Action**: **DELETE** - No references found

---

## Scanner Components Analysis

### ✅ KEEP - Active Scanner Components

#### 1. `MinimalScanOverlay.tsx` (PRIMARY SCANNER)
- **Status**: ✅ ACTIVELY USED
- **Used by**: WarehouseMapNew.tsx
- **Purpose**: Scanner overlay for map-based scanning
- **Features**:
  - Scanner mode (hidden input, isolated from React)
  - Keyboard mode (manual entry fallback)
  - GPS-based position logging
  - Session-aware scanning
- **Recent Changes**: Complete rewrite with hidden input approach (2026-02-06)
- **Action**: **KEEP** - Main scanner for warehouse map

#### 2. `QuickScanner.tsx` (GLOBAL QUICK SCAN)
- **Status**: ✅ ACTIVELY USED
- **Used by**: ScannerOverlay.tsx
- **Purpose**: Global quick scan overlay (accessed via context)
- **Features**:
  - Ad-hoc mode (quick map marker)
  - Fog-of-war mode (inventory validation + map marker)
  - BarcodeScanner integration
  - Clipboard fallback
- **Uses**: `inventoryScanner.ts` for item lookup
- **Action**: **KEEP** - Different use case than MinimalScanOverlay

#### 3. `ScannerOverlay.tsx` (CONTEXT WRAPPER)
- **Status**: ✅ ACTIVELY USED
- **Used by**: OverlayStack.tsx (global overlay)
- **Purpose**: Wrapper that connects ScannerOverlayContext to QuickScanner
- **Action**: **KEEP** - Required for global scanner context

#### 4. `BarcodeScanner.tsx` (CAMERA SCANNER)
- **Status**: ✅ ACTIVELY USED
- **Used by**:
  - MinimalScanOverlay.tsx (camera fallback)
  - QuickScanner.tsx (camera option)
- **Purpose**: Camera-based barcode scanning using html5-qrcode
- **Action**: **KEEP** - Used as fallback when bluetooth scanner unavailable

---

## Scanner Context

### ✅ KEEP - Scanner Infrastructure

#### `ScannerOverlayContext.tsx`
- **Status**: ✅ ACTIVELY USED
- **Used by**:
  - App.tsx (provides context)
  - ScannerOverlay.tsx (consumes context)
- **Purpose**: Global scanner state management
- **Features**:
  - `openScanner()` - trigger quick scan from anywhere
  - `closeScanner()` - dismiss overlay
- **Action**: **KEEP** - Required for global quick scan functionality

---

## Scanner Logic Libraries

### ✅ KEEP - Both Libraries (Different Purposes)

#### 1. `sessionScanner.ts` (SESSION-AWARE LOOKUP)
- **Status**: ✅ ACTIVELY USED
- **Used by**: WarehouseMapNew.tsx
- **Purpose**: Find items within session context
- **Functions**:
  - `findItemOwningSession()` - Search by barcode with ASIS/STA deduplication
- **Key Feature**: Applies ASIS/STA priority rules (STA wins)
- **Action**: **KEEP** - Used by map scanner

#### 2. `inventoryScanner.ts` (GENERAL INVENTORY LOOKUP)
- **Status**: ✅ ACTIVELY USED
- **Used by**: QuickScanner.tsx
- **Purpose**: Search entire inventory without session context
- **Functions**:
  - `findMatchingItemsInInventory()` - Search across serial/CSO/model
- **Key Feature**: No session context, just finds items
- **Action**: **KEEP** - Used by quick scanner

**Note**: These serve different purposes and should both be kept:
- `sessionScanner.ts` = Session-aware, ASIS/STA deduplication, used in warehouse map
- `inventoryScanner.ts` = General search, used in quick scan / fog-of-war

---

## Supporting Files

### ✅ KEEP - All Required

#### Map Support
- `mapManager.ts` - GPS, location logging ✅
- `useMap.ts` - React Query hooks for map data ✅
- `useMapMetadata.ts` - Session and load metadata ✅
- `map.ts` (types) - TypeScript definitions ✅
- `map.tsx` (ui component) - MapLibre wrapper ✅
- `BlankMapStyle.ts` - MapLibre style config ✅

---

## Cleanup Recommendations

### 🗑️ SAFE TO DELETE

1. **`src/components/Map/MapOverlay.tsx`**
   - Not imported anywhere
   - Redundant with MapView.tsx
   - No references found

### ✅ KEEP EVERYTHING ELSE

All other components are actively used and serve distinct purposes:

**Scanner Components (all active)**:
- MinimalScanOverlay - Map-based scanning with session context
- QuickScanner - Global quick scan with ad-hoc/fog-of-war modes
- ScannerOverlay - Context wrapper
- BarcodeScanner - Camera fallback
- ScannerOverlayContext - Global state

**Map Components (all active)**:
- WarehouseMapNew - Main map implementation
- MapView - Route wrapper

**Scanner Libraries (both needed)**:
- sessionScanner - Session-aware lookup with ASIS/STA dedup
- inventoryScanner - General inventory search

---

## Architecture Overview

### Scanner Flow

```
User initiates scan from:

1. Warehouse Map (MinimalScanOverlay)
   └─> GPS position + session context
   └─> Uses: sessionScanner.ts (ASIS/STA deduplication)
   └─> Camera fallback: BarcodeScanner

2. Global Quick Scan (via context button)
   └─> Opens ScannerOverlay → QuickScanner
   └─> Ad-hoc mode: Creates map marker
   └─> Fog-of-war mode: Validates + creates marker
   └─> Uses: inventoryScanner.ts (no session context)
   └─> Camera option: BarcodeScanner
```

### Map Flow

```
App.tsx (route)
  └─> MapView (route wrapper)
      └─> WarehouseMapNew (main map)
          ├─> MinimalScanOverlay (scanner)
          │   ├─> Scanner mode (bluetooth)
          │   ├─> Keyboard mode (manual)
          │   └─> BarcodeScanner (camera)
          └─> GPS tracking + markers
```

---

## Migration Notes

### If Cleaning Up MapOverlay

```bash
# Safe to delete - no references found
rm src/components/Map/MapOverlay.tsx
```

**Impact**: None - file is not imported or used anywhere

---

## Future Considerations

### Potential Consolidation (NOT RECOMMENDED NOW)

**Do NOT consolidate these**:
- MinimalScanOverlay vs QuickScanner - Different use cases
- sessionScanner vs inventoryScanner - Different lookup logic
- MapView vs MapOverlay - MapOverlay is already unused

**Why keep separate**:
1. **MinimalScanOverlay** is tightly integrated with map session management
2. **QuickScanner** is a global utility accessible from anywhere
3. **sessionScanner** has ASIS/STA deduplication logic
4. **inventoryScanner** is simpler, session-agnostic search

Consolidation would create a mega-component with too many responsibilities.

---

## Action Items

- [ ] Delete `src/components/Map/MapOverlay.tsx`
- [ ] Verify no broken imports after deletion
- [ ] Update this document if any other unused code is found

---

## Conclusion

**Components to Delete**: 1 (MapOverlay.tsx)
**Components to Keep**: All others (actively used with distinct purposes)

The codebase is relatively clean. The only unused file is MapOverlay.tsx, which appears to be leftover from an old architecture. Everything else is actively used and serves a specific purpose in the scanner/map ecosystem.
