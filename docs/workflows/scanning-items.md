# Scanning Items in the Warehouse

How to scan items to record their GPS location and update inventory.

## Overview

The Warehouse app lets you scan items using:
- **Keyboard/barcode scanner** - Type or scan barcodes directly
- **Camera scanner** - Use your phone's camera to scan barcodes

Scanning records the item's GPS location on the warehouse map.

## Two Scanning Modes

### Ad-hoc Mode
**Use when:** You want to quickly mark anything on the map, regardless of whether it's in inventory.

**What it does:**
- Accepts any barcode (no validation)
- Creates GPS marker immediately
- Saves to permanent "Ad-hoc Scan" session
- Useful for marking locations, deliveries, problem areas

**Example:** Scan a pallet number, delivery truck, or temporary marker.

### Fog of War Mode
**Use when:** You want to validate items against inventory and update their positions.

**What it does:**
- Validates barcode against inventory database
- Only accepts serial numbers or CSO numbers (not models)
- Updates existing item's GPS location
- Saves to permanent "Fog of War" session

**Example:** Walking the warehouse to verify and update item locations.

**Important:** Model-only scans require session context - use Scanning Sessions instead.

## Quick Scanning (No Session)

For quick one-off scans without creating a formal session.

### Steps:
1. Open the Warehouse app
2. Look for the floating scanner button (usually bottom-right)
3. Tap the scanner button
4. Choose your mode:
   - **Ad-hoc** - Scan anything
   - **Fog of War** - Validate against inventory
5. Enter the barcode:
   - Type it manually, OR
   - Tap "Use Camera Scanner" to scan with camera
6. Press Enter or tap Submit
7. App records GPS location automatically

### What Happens:
- ✅ Success: "Marked on map" or "Updated: [item]"
- ❌ Error: "Not in inventory" (Fog of War) or "GPS unavailable"

GPS location is captured automatically when you scan.

## Scanning Sessions (Batch Scanning)

For organized batch scanning of specific inventory types.

### When to Use Sessions:
- Scanning all items in a sub-inventory
- Physical inventory count
- Scanning by product type (all refrigerators)
- Scanning models (which require session context)

### Steps:
1. Navigate to "Scanning Sessions" from sidebar
2. Tap "Create New Session"
3. Configure session:
   - **Name:** Descriptive name (e.g., "B3 Inventory Count")
   - **Inventory Type:** Product type to scan
   - **Sub-Inventory:** Optional filter (e.g., "B3", "Staging")
4. Tap "Create & Start"
5. Scan items using keyboard or camera
6. App shows progress: X / Y items scanned
7. Tap "Close Session" when done

### Session Features:
- Track progress (scanned vs. total items)
- See what's already scanned (green checkmarks)
- See what's missing (items not yet scanned)
- Export results when closed
- Reopen later to continue

### Model Scanning in Sessions:
Unlike Fog of War mode, sessions allow model-only scans because:
- Session knows what product type you're scanning
- Can disambiguate between multiple items with same model
- Shows you which specific items need scanning

## Camera Scanner

When you tap "Use Camera Scanner":

### How to Use:
1. Point camera at barcode
2. Center barcode in frame
3. Wait for automatic detection (green highlight)
4. Scan is submitted automatically

### Tips:
- Good lighting helps
- Hold steady for 1-2 seconds
- Works with most 1D and 2D barcodes
- Can scan serial tags, CSO labels, model plates

## GPS Markers on Map

Every scan creates or updates a GPS marker.

### What's Recorded:
- Latitude/longitude (from your phone's GPS)
- Accuracy (typically ±5-10 meters)
- Timestamp (when scanned)
- Scanned by (your username)
- Product type and sub-inventory
- Session ID (which session it belongs to)

### Viewing Scanned Items:
1. Go to "Warehouse Map"
2. See colored markers for all scanned items
3. Click marker to see item details
4. Filter by product type, sub-inventory, or session

## Common Workflows

### Workflow 1: Quick Mark a Delivery Location
1. Tap scanner button (floating FAB)
2. Select "Ad-hoc" mode
3. Scan delivery truck number or pallet ID
4. GPS marker shows delivery location
5. Close scanner

### Workflow 2: Update a Single Item's Location
1. Tap scanner button
2. Select "Fog of War" mode
3. Scan item's serial number or CSO
4. System validates it's in inventory
5. GPS location updated automatically

### Workflow 3: Count All Refrigerators in Sub-Inventory B3
1. Create new scanning session
2. Set Inventory Type = "Refrigerator"
3. Set Sub-Inventory = "B3"
4. Scan each refrigerator
5. App shows "12 / 15 scanned" progress
6. Close session when done

### Workflow 4: Physical Inventory of Entire Warehouse
1. Create session for each product type
2. Scan all items in each session
3. Map shows full warehouse coverage
4. Export session results for reports

## Troubleshooting

**Q: "GPS unavailable" error**
- Enable location services on your device
- Make sure browser/app has location permission
- Move to area with better GPS signal (near windows/outside)

**Q: "Not in inventory" error (Fog of War)**
- Item isn't in the inventory database yet
- May need to sync from GE DMS first
- Try Ad-hoc mode instead to mark location anyway
- Check if serial/CSO number is correct

**Q: Camera scanner not working**
- Grant camera permission to browser/app
- Try better lighting
- Clean camera lens
- Fall back to manual keyboard entry

**Q: Scanned wrong item**
- Can't undo a scan
- Re-scan the correct item to update
- Or note in session comments

**Q: Model scan rejected in Fog of War**
- Models need session context
- Create a scanning session instead
- Or scan serial/CSO number if available

## Best Practices

1. **Always enable GPS** before scanning
2. **Use Fog of War** for inventory validation
3. **Use Ad-hoc** for temporary markers
4. **Create sessions** for batch work
5. **Check map** after scanning to verify marker placement
6. **Close sessions** when done to free up the list
7. **Name sessions clearly** for future reference

## Keyboard Shortcuts

When scanner is open:
- **Enter** - Submit scan
- **Esc** - Close scanner
- **Tab** - Switch between input and camera
