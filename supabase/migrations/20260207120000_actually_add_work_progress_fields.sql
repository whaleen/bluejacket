-- Actually add the work progress fields (previous migration was marked applied but didn't run)

-- Add scanning progress fields
ALTER TABLE load_metadata
  ADD COLUMN IF NOT EXISTS items_scanned_count INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS items_total_count INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS scanning_complete BOOLEAN DEFAULT FALSE;

-- Add enhanced sanity check fields
ALTER TABLE load_metadata
  ADD COLUMN IF NOT EXISTS sanity_check_stage TEXT CHECK (sanity_check_stage IN ('early', 'final')),
  ADD COLUMN IF NOT EXISTS sanity_check_parameters JSONB,
  ADD COLUMN IF NOT EXISTS sanity_last_checked_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS sanity_last_checked_by TEXT;

-- Add index for work status queries
CREATE INDEX IF NOT EXISTS idx_load_metadata_work_status
  ON load_metadata(location_id, inventory_type, prep_tagged, prep_wrapped, scanning_complete, sanity_check_requested);

-- Recalculate scanning progress for all loads
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
    plh.inventory_item_id = i.id AND
    plh.location_id = lm.location_id
  GROUP BY lm.location_id, lm.inventory_type, lm.sub_inventory_name
)
UPDATE load_metadata lm
SET
  items_scanned_count = COALESCE(lc.scanned_count, 0),
  items_total_count = COALESCE(lc.total_count, 0),
  scanning_complete = CASE
    WHEN COALESCE(lc.total_count, 0) > 0
      THEN COALESCE(lc.scanned_count, 0) >= COALESCE(lc.total_count, 0)
    ELSE false
  END
FROM load_counts lc
WHERE
  lm.location_id = lc.location_id AND
  lm.inventory_type = lc.inventory_type AND
  lm.sub_inventory_name = lc.sub_inventory_name;
