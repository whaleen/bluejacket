-- Add snapshot fields to product_location_history
-- Since we can't reliably join to inventory_items (session snapshots),
-- we store the data we need directly

ALTER TABLE public.product_location_history
  ADD COLUMN IF NOT EXISTS product_type text,
  ADD COLUMN IF NOT EXISTS sub_inventory text;

COMMENT ON COLUMN public.product_location_history.product_type IS 'Snapshot of product type at scan time (e.g., REFRIGERATOR, WASHER)';
COMMENT ON COLUMN public.product_location_history.sub_inventory IS 'Snapshot of load/sub_inventory at scan time for color mapping';
