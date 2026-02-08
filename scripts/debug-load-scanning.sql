-- Debug scanning progress for a specific load
-- Replace 'AF' with the actual sub_inventory_name

-- 1. Check load metadata
SELECT
  sub_inventory_name,
  inventory_type,
  ge_units,
  items_total_count,
  items_scanned_count,
  scanning_complete
FROM load_metadata
WHERE sub_inventory_name ILIKE '%AF%'
ORDER BY sub_inventory_name;

-- 2. Count actual items in inventory_items for this load
SELECT
  sub_inventory,
  COUNT(*) as actual_item_count
FROM inventory_items
WHERE sub_inventory ILIKE '%AF%'
GROUP BY sub_inventory
ORDER BY sub_inventory;

-- 3. Count items with location history (scanned items)
SELECT
  i.sub_inventory,
  COUNT(DISTINCT i.id) as items_with_location_history
FROM inventory_items i
INNER JOIN product_location_history plh ON plh.inventory_item_id = i.id
WHERE i.sub_inventory ILIKE '%AF%'
GROUP BY i.sub_inventory
ORDER BY i.sub_inventory;

-- 4. Show the calculation that should be used
WITH load_counts AS (
  SELECT
    lm.location_id,
    lm.inventory_type,
    lm.sub_inventory_name,
    COUNT(DISTINCT i.id) AS total_count,
    COUNT(DISTINCT CASE WHEN plh.inventory_item_id IS NOT NULL THEN i.id END) AS scanned_count
  FROM load_metadata lm
  LEFT JOIN inventory_items i ON
    i.location_id = lm.location_id AND
    i.inventory_type = lm.inventory_type AND
    i.sub_inventory = lm.sub_inventory_name
  LEFT JOIN product_location_history plh ON
    plh.inventory_item_id = i.id
  WHERE lm.sub_inventory_name ILIKE '%AF%'
  GROUP BY lm.location_id, lm.inventory_type, lm.sub_inventory_name
)
SELECT * FROM load_counts;
