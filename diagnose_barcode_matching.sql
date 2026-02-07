-- Diagnose why findItemOwningSession() is failing to match barcodes
-- Run these queries to identify the barcode matching issue

-- 1. Find all "Review" markers (failed matches from Fog of War scans)
SELECT
  id,
  product_type as scanned_barcode,
  sub_inventory,
  created_at,
  raw_lat,
  raw_lng
FROM product_location_history
WHERE location_id = (SELECT id FROM locations LIMIT 1)
  AND inventory_item_id IS NULL
  AND sub_inventory = 'Review'
ORDER BY created_at DESC
LIMIT 20;

-- 2. Check if these barcodes exist in inventory_items (case-insensitive)
WITH failed_scans AS (
  SELECT DISTINCT product_type as scanned_barcode
  FROM product_location_history
  WHERE location_id = (SELECT id FROM locations LIMIT 1)
    AND inventory_item_id IS NULL
    AND sub_inventory = 'Review'
    AND product_type IS NOT NULL
)
SELECT
  fs.scanned_barcode,
  ii.serial,
  ii.cso,
  ii.model,
  ii.inventory_type,
  ii.sub_inventory,
  CASE
    WHEN LOWER(ii.serial) = LOWER(fs.scanned_barcode) THEN 'serial (case mismatch)'
    WHEN LOWER(ii.cso) = LOWER(fs.scanned_barcode) THEN 'cso (case mismatch)'
    WHEN LOWER(ii.model) = LOWER(fs.scanned_barcode) THEN 'model (case mismatch)'
    WHEN ii.serial = fs.scanned_barcode THEN 'serial (exact match)'
    WHEN ii.cso = fs.scanned_barcode THEN 'cso (exact match)'
    WHEN ii.model = fs.scanned_barcode THEN 'model (exact match)'
    ELSE 'no match'
  END as match_type
FROM failed_scans fs
LEFT JOIN inventory_items ii ON (
  LOWER(ii.serial) = LOWER(fs.scanned_barcode)
  OR LOWER(ii.cso) = LOWER(fs.scanned_barcode)
  OR LOWER(ii.model) = LOWER(fs.scanned_barcode)
)
WHERE ii.location_id = (SELECT id FROM locations LIMIT 1)
ORDER BY fs.scanned_barcode;

-- 3. Check for whitespace/formatting issues
WITH failed_scans AS (
  SELECT DISTINCT
    product_type as scanned_barcode,
    LENGTH(product_type) as barcode_length,
    LENGTH(TRIM(product_type)) as trimmed_length
  FROM product_location_history
  WHERE location_id = (SELECT id FROM locations LIMIT 1)
    AND inventory_item_id IS NULL
    AND sub_inventory = 'Review'
    AND product_type IS NOT NULL
)
SELECT
  fs.scanned_barcode,
  fs.barcode_length,
  fs.trimmed_length,
  fs.barcode_length - fs.trimmed_length as whitespace_chars,
  ii.serial,
  ii.cso,
  ii.model
FROM failed_scans fs
LEFT JOIN inventory_items ii ON (
  TRIM(ii.serial) = TRIM(fs.scanned_barcode)
  OR TRIM(ii.cso) = TRIM(fs.scanned_barcode)
  OR TRIM(ii.model) = TRIM(fs.scanned_barcode)
)
WHERE ii.location_id = (SELECT id FROM locations LIMIT 1);

-- 4. Show sample of what's actually in inventory_items for comparison
SELECT
  serial,
  cso,
  model,
  inventory_type,
  sub_inventory,
  LENGTH(serial) as serial_length,
  LENGTH(cso) as cso_length,
  LENGTH(model) as model_length
FROM inventory_items
WHERE location_id = (SELECT id FROM locations LIMIT 1)
  AND (serial IS NOT NULL OR cso IS NOT NULL OR model IS NOT NULL)
LIMIT 20;

-- 5. Check the exact query that findItemOwningSession() runs
-- Replace 'BARCODE_HERE' with an actual failed barcode from query #1
SELECT *
FROM inventory_items
WHERE location_id = (SELECT id FROM locations LIMIT 1)
  AND (serial = 'BARCODE_HERE' OR cso = 'BARCODE_HERE' OR model = 'BARCODE_HERE');
