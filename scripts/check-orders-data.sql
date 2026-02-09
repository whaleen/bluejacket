-- Check what's in the orders table
SELECT
  column_name,
  data_type
FROM information_schema.columns
WHERE table_name = 'orders'
ORDER BY ordinal_position;

-- See sample order data
SELECT *
FROM orders
LIMIT 5;

-- Count orders
SELECT COUNT(*) as total_orders
FROM orders;

-- Check if there are any serials or models in the orders table
SELECT
  COUNT(CASE WHEN serial IS NOT NULL THEN 1 END) as orders_with_serial,
  COUNT(CASE WHEN model IS NOT NULL THEN 1 END) as orders_with_model
FROM orders;
