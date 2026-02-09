-- Try to match STA inventory items to orders

-- First, check what fields we have to work with
SELECT 'Inventory Items' as source, COUNT(*) as count
FROM inventory_items
WHERE inventory_type = 'STA'
UNION ALL
SELECT 'Orders' as source, COUNT(*) as count
FROM orders;

-- Try matching by serial number (if orders have serials)
SELECT
  ii.serial,
  ii.model,
  ii.inventory_type,
  ii.cso as item_cso,
  o.cso as order_cso,
  o.customer,
  o.delivery_date,
  o.status as order_status
FROM inventory_items ii
LEFT JOIN orders o ON ii.serial = o.serial
WHERE ii.inventory_type IN ('STA', 'LocalStock', 'Staged')
  AND ii.ge_orphaned IS NOT TRUE
LIMIT 20;

-- Try matching by model number (if orders have models)
SELECT
  ii.model,
  COUNT(ii.id) as items_with_model,
  COUNT(DISTINCT o.cso) as matching_orders
FROM inventory_items ii
LEFT JOIN orders o ON ii.model = o.model
WHERE ii.inventory_type IN ('STA', 'LocalStock')
  AND ii.ge_orphaned IS NOT TRUE
GROUP BY ii.model
HAVING COUNT(DISTINCT o.cso) > 0
LIMIT 20;

-- Check if orders table has a separate line_items or order_items table
SELECT table_name
FROM information_schema.tables
WHERE table_name LIKE '%order%'
  OR table_name LIKE '%line%';
