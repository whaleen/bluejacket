-- Recalculate scanning progress for all loads
-- Total count comes from ge_units (GE sync is source of truth)
-- Scanned count = items from this load that have product_location_history entries

WITH load_counts AS (
  SELECT
    lm.location_id,
    lm.inventory_type,
    lm.sub_inventory_name,
    -- Use ge_units from GE sync as total (source of truth)
    COALESCE(lm.ge_units, 0) AS total_count,
    -- Count items from this load that have been mapped
    COUNT(DISTINCT plh.inventory_item_id) AS scanned_count
  FROM load_metadata lm
  LEFT JOIN inventory_items i ON
    i.location_id = lm.location_id AND
    i.sub_inventory = lm.sub_inventory_name
  LEFT JOIN product_location_history plh ON
    plh.inventory_item_id = i.id AND
    plh.location_id = lm.location_id
  GROUP BY lm.location_id, lm.inventory_type, lm.sub_inventory_name, lm.ge_units
)
UPDATE load_metadata lm
SET
  items_scanned_count = lc.scanned_count,
  items_total_count = lc.total_count,
  scanning_complete = CASE
    WHEN lc.total_count > 0 THEN lc.scanned_count >= lc.total_count
    ELSE false
  END
FROM load_counts lc
WHERE
  lm.location_id = lc.location_id AND
  lm.inventory_type = lc.inventory_type AND
  lm.sub_inventory_name = lc.sub_inventory_name;

-- Show updated counts
SELECT
  sub_inventory_name,
  items_scanned_count,
  items_total_count,
  scanning_complete,
  CASE
    WHEN items_total_count > 0
    THEN ROUND((items_scanned_count::numeric / items_total_count::numeric) * 100, 1)
    ELSE 0
  END AS scan_percentage
FROM load_metadata
WHERE items_total_count > 0
ORDER BY sub_inventory_name;
