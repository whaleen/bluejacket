-- Auto-update load scanning progress when items are scanned/unscanned
-- This trigger updates load_metadata automatically when product_location_history changes

-- Function to recalculate scanning progress for a specific load
CREATE OR REPLACE FUNCTION update_load_scanning_progress()
RETURNS TRIGGER AS $$
DECLARE
  v_location_id TEXT;
  v_sub_inventory TEXT;
  v_total_count INTEGER;
  v_scanned_count INTEGER;
BEGIN
  -- Get the affected item's location and load
  IF TG_OP = 'DELETE' THEN
    SELECT location_id, sub_inventory INTO v_location_id, v_sub_inventory
    FROM inventory_items
    WHERE id = OLD.inventory_item_id;
  ELSE
    SELECT location_id, sub_inventory INTO v_location_id, v_sub_inventory
    FROM inventory_items
    WHERE id = NEW.inventory_item_id;
  END IF;

  -- Skip if item is not in a load
  IF v_sub_inventory IS NULL THEN
    RETURN COALESCE(NEW, OLD);
  END IF;

  -- Get total count from ge_units (source of truth)
  SELECT COALESCE(ge_units, 0) INTO v_total_count
  FROM load_metadata
  WHERE location_id = v_location_id
    AND sub_inventory_name = v_sub_inventory;

  -- Count items with location history (scanned items)
  SELECT COUNT(DISTINCT plh.inventory_item_id) INTO v_scanned_count
  FROM inventory_items i
  INNER JOIN product_location_history plh ON
    plh.inventory_item_id = i.id AND
    plh.location_id = i.location_id
  WHERE i.location_id = v_location_id
    AND i.sub_inventory = v_sub_inventory;

  -- Update load metadata
  UPDATE load_metadata
  SET
    items_scanned_count = v_scanned_count,
    items_total_count = v_total_count,
    scanning_complete = (v_total_count > 0 AND v_scanned_count >= v_total_count),
    updated_at = NOW()
  WHERE location_id = v_location_id
    AND sub_inventory_name = v_sub_inventory;

  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

-- Drop existing trigger if it exists
DROP TRIGGER IF EXISTS trigger_update_scanning_progress ON product_location_history;

-- Create trigger on INSERT/DELETE of product_location_history
CREATE TRIGGER trigger_update_scanning_progress
  AFTER INSERT OR DELETE ON product_location_history
  FOR EACH ROW
  EXECUTE FUNCTION update_load_scanning_progress();

-- Also update when items change loads (sub_inventory changes)
CREATE OR REPLACE FUNCTION update_scanning_on_item_change()
RETURNS TRIGGER AS $$
BEGIN
  -- If sub_inventory changed, recalculate both old and new loads
  IF OLD.sub_inventory IS DISTINCT FROM NEW.sub_inventory THEN
    -- Update old load if it existed
    IF OLD.sub_inventory IS NOT NULL THEN
      PERFORM update_load_scanning_progress_for_load(OLD.location_id, OLD.sub_inventory);
    END IF;

    -- Update new load if it exists
    IF NEW.sub_inventory IS NOT NULL THEN
      PERFORM update_load_scanning_progress_for_load(NEW.location_id, NEW.sub_inventory);
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Helper function to update a specific load
CREATE OR REPLACE FUNCTION update_load_scanning_progress_for_load(
  p_location_id TEXT,
  p_sub_inventory TEXT
)
RETURNS VOID AS $$
DECLARE
  v_total_count INTEGER;
  v_scanned_count INTEGER;
BEGIN
  -- Get total count from ge_units
  SELECT COALESCE(ge_units, 0) INTO v_total_count
  FROM load_metadata
  WHERE location_id = p_location_id
    AND sub_inventory_name = p_sub_inventory;

  -- Count scanned items
  SELECT COUNT(DISTINCT plh.inventory_item_id) INTO v_scanned_count
  FROM inventory_items i
  INNER JOIN product_location_history plh ON
    plh.inventory_item_id = i.id AND
    plh.location_id = i.location_id
  WHERE i.location_id = p_location_id
    AND i.sub_inventory = p_sub_inventory;

  -- Update load metadata
  UPDATE load_metadata
  SET
    items_scanned_count = v_scanned_count,
    items_total_count = v_total_count,
    scanning_complete = (v_total_count > 0 AND v_scanned_count >= v_total_count),
    updated_at = NOW()
  WHERE location_id = p_location_id
    AND sub_inventory_name = p_sub_inventory;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_update_scanning_on_item_change ON inventory_items;

CREATE TRIGGER trigger_update_scanning_on_item_change
  AFTER UPDATE OF sub_inventory ON inventory_items
  FOR EACH ROW
  EXECUTE FUNCTION update_scanning_on_item_change();

-- Show current state
SELECT
  sub_inventory_name,
  items_scanned_count,
  items_total_count,
  scanning_complete
FROM load_metadata
WHERE items_total_count > 0
ORDER BY sub_inventory_name
LIMIT 10;
