-- Clean up "Review" markers that failed to match due to case-sensitive bug
-- Run this AFTER deploying the fix to sessionScanner.ts

-- Option 1: Delete all failed "Review" markers (simplest)
DELETE FROM product_location_history
WHERE location_id = (SELECT id FROM locations LIMIT 1)
  AND inventory_item_id IS NULL
  AND sub_inventory = 'Review';

-- Option 2: Try to backfill inventory_item_id for existing markers (more complex)
-- This attempts to match the scanned barcode to inventory_items using case-insensitive matching
WITH matched_items AS (
  SELECT
    plh.id as location_history_id,
    ii.id as inventory_item_id,
    ii.inventory_type,
    ii.sub_inventory
  FROM product_location_history plh
  INNER JOIN inventory_items ii ON (
    LOWER(ii.serial) = LOWER(plh.product_type)
    OR LOWER(ii.cso) = LOWER(plh.product_type)
    OR LOWER(ii.model) = LOWER(plh.product_type)
  )
  WHERE plh.location_id = (SELECT id FROM locations LIMIT 1)
    AND plh.inventory_item_id IS NULL
    AND plh.sub_inventory = 'Review'
    AND plh.product_type IS NOT NULL
    AND ii.location_id = (SELECT id FROM locations LIMIT 1)
)
UPDATE product_location_history
SET
  inventory_item_id = matched_items.inventory_item_id,
  sub_inventory = matched_items.sub_inventory,
  product_type = NULL  -- Clear the temporary barcode storage
FROM matched_items
WHERE product_location_history.id = matched_items.location_history_id;

-- Verify the backfill worked
SELECT
  COUNT(*) as total_review_markers,
  COUNT(inventory_item_id) as now_matched,
  COUNT(*) - COUNT(inventory_item_id) as still_unmatched
FROM product_location_history
WHERE location_id = (SELECT id FROM locations LIMIT 1)
  AND sub_inventory = 'Review';
