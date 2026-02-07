-- Check product_location_history records missing inventory_item_id
SELECT 
  COUNT(*) as total_locations,
  COUNT(inventory_item_id) as with_item_id,
  COUNT(*) - COUNT(inventory_item_id) as missing_item_id
FROM product_location_history
WHERE location_id = (SELECT id FROM locations LIMIT 1);

-- Check inventory_type distribution for items with item_id
SELECT 
  ii.inventory_type,
  COUNT(*) as count
FROM product_location_history plh
LEFT JOIN inventory_items ii ON plh.inventory_item_id = ii.id
WHERE plh.location_id = (SELECT id FROM locations LIMIT 1)
  AND plh.inventory_item_id IS NOT NULL
GROUP BY ii.inventory_type
ORDER BY count DESC;

-- Check unlinked locations
SELECT 
  plh.product_type,
  plh.sub_inventory,
  COUNT(*) as count
FROM product_location_history plh
WHERE plh.location_id = (SELECT id FROM locations LIMIT 1)
  AND plh.inventory_item_id IS NULL
GROUP BY plh.product_type, plh.sub_inventory
ORDER BY count DESC
LIMIT 10;
