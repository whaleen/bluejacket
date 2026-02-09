# Orders Sync

## Overview
The orders sync uses GE DMS Order Data (Enhanced JSON export) to pull a rolling window of orders and store them in the database for system-wide reference.

## Sources
- Order Data: `/dms/orderdata` (Order Data - Enhanced JSON)
- Track & Trace: `/dms/tracktrace/trackDetailMain` (not required for base sync)

## Behavior
- Default window: 90 days back, 30 days forward.
- Uses the Order Data - Enhanced JSON export.
- Stores data in:
  - `orders`
  - `order_deliveries`
  - `order_lines`

## Environment Variables
- `ORDERDATA_DMS_LOC` (default `19SU`)
- `ORDERDATA_DAYS_BACK` (default `90`)
- `ORDERDATA_DAYS_FORWARD` (default `30`)

## Notes
- Order Data includes an **Inbound Shipment #** filter, but it does not always return current inbound shipments.
- For current inbound, rely on the Inbound Summary + ASN workflow and track gaps separately.
