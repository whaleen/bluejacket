-- Trigger to update items_total_count when ge_units changes via GE sync
-- This ensures scanning progress totals stay in sync with GE data

CREATE OR REPLACE FUNCTION sync_total_count_from_ge_units()
RETURNS TRIGGER AS $$
BEGIN
  -- If ge_units changed, update items_total_count
  IF OLD.ge_units IS DISTINCT FROM NEW.ge_units THEN
    NEW.items_total_count := COALESCE(NEW.ge_units, 0);

    -- Recalculate scanning_complete based on new total
    IF NEW.items_total_count > 0 THEN
      NEW.scanning_complete := (COALESCE(NEW.items_scanned_count, 0) >= NEW.items_total_count);
    ELSE
      NEW.scanning_complete := false;
    END IF;

    -- Update timestamp
    NEW.updated_at := NOW();
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Drop existing trigger if it exists
DROP TRIGGER IF EXISTS trigger_sync_ge_units ON load_metadata;

-- Create trigger on UPDATE of load_metadata
CREATE TRIGGER trigger_sync_ge_units
  BEFORE UPDATE ON load_metadata
  FOR EACH ROW
  WHEN (OLD.ge_units IS DISTINCT FROM NEW.ge_units)
  EXECUTE FUNCTION sync_total_count_from_ge_units();

-- Verify current state
SELECT
  sub_inventory_name,
  ge_units,
  items_total_count,
  items_scanned_count,
  scanning_complete,
  CASE
    WHEN ge_units IS DISTINCT FROM items_total_count THEN '❌ OUT OF SYNC'
    ELSE '✅ IN SYNC'
  END as sync_status
FROM load_metadata
WHERE ge_units IS NOT NULL
ORDER BY sync_status DESC, sub_inventory_name
LIMIT 20;
