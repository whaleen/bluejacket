# Finding Items in the Warehouse

How to locate items when you don't know where they are physically.

## Overview

There are three ways to find an item in the warehouse:
1. Search the app's inventory
2. Check the warehouse map
3. Check GE DMS system

**Important:** You CANNOT scan an item to find it - you need to find it first before you can scan it.

## Method 1: Search Inventory in Warehouse App

The fastest way to find an item if you know its serial number, CSO, or model.

### Steps:
1. Open the Warehouse app
2. Navigate to "Inventory" from the sidebar
3. Use the search bar to search by:
   - Serial number (exact match)
   - CSO number (exact match)
   - Model number (partial match)
   - Product type (e.g., "refrigerator", "dishwasher")
4. Click on the item in results to see details
5. Check the "Last Scanned Location" if available

### What You'll See:
- Item details (model, serial, CSO)
- Product type and sub-inventory
- Status (available, shipped, etc.)
- Last scanned GPS coordinates (if item was previously scanned)

## Method 2: Check Warehouse Map

Use the map to see where items were last scanned.

### Steps:
1. Open the Warehouse app
2. Navigate to "Warehouse Map" from the sidebar
3. Use map filters to narrow down items:
   - Filter by product type
   - Filter by sub-inventory
   - Filter by scanning session
4. Click on map markers to see item details
5. Navigate to the GPS location shown on the map

### When This Works:
- Item must have been scanned at least once before
- GPS marker shows last known location
- Accuracy depends on when it was last scanned

### When This Doesn't Work:
- New items never scanned before
- Items that were moved after last scan

## Method 3: Check GE DMS System

For the most up-to-date warehouse location according to GE's system.

### Steps:
1. Log into GE DMS system
2. Navigate to Inventory module
3. Search by:
   - Serial number
   - CSO number
   - Model number
4. Check the "Location" or "Warehouse Position" field
5. Navigate to that physical location in the warehouse

### GE DMS Locations:
- Usually formatted as Aisle-Bay-Shelf (e.g., "A3-B2-S1")
- Or zone-based (e.g., "Zone B", "Staging Area")

## Best Practice Workflow

For fastest results, use this order:

1. **Start with Warehouse App Inventory**
   - Quick search by serial/CSO/model
   - See if there's a recent GPS location

2. **Check Warehouse Map**
   - If GPS location exists, navigate there
   - Item should be within ~5 meters of marker

3. **Fall back to GE DMS**
   - If not found at GPS location
   - Get official warehouse position
   - Item may have been moved

## Common Scenarios

### Scenario: Looking for a specific refrigerator
1. Search inventory by serial number or CSO
2. Check map for last scanned location
3. Walk to GPS coordinates
4. If not there, check GE DMS for current location

### Scenario: Finding all dishwashers in sub-inventory B3
1. Go to Inventory view
2. Filter by product_type = "dishwasher"
3. Filter by sub_inventory = "B3"
4. Export list or check map for GPS markers

### Scenario: Item never scanned before
1. Skip map (no GPS data available)
2. Go directly to GE DMS
3. Get warehouse location from GE system
4. Navigate there physically

## Troubleshooting

**Q: Map shows a location but item isn't there**
- Item may have been moved after last scan
- Check GE DMS for updated location
- Scan nearby items to update map

**Q: Can't find item in inventory search**
- Item might not be synced from GE yet
- Check GE DMS directly
- Wait for next GE sync (runs hourly)

**Q: GPS marker is inaccurate**
- GPS accuracy varies (typically ±5-10 meters)
- Use marker as general area, not exact spot
- Scan item when found to update location
