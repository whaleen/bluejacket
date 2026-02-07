-- Add scanning progress and enhanced sanity check fields to load_metadata
-- Migration: Load Work Progress Fields

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

-- Add index for querying loads needing attention (action items)
CREATE INDEX IF NOT EXISTS idx_load_metadata_work_status
  ON load_metadata(location_id, inventory_type, prep_tagged, prep_wrapped, scanning_complete, sanity_check_requested)
  WHERE status != 'delivered';

-- Add index for sanity check queries
CREATE INDEX IF NOT EXISTS idx_load_metadata_sanity_status
  ON load_metadata(location_id, sanity_check_requested, sanity_completed_at)
  WHERE sanity_check_requested = TRUE;

-- Comment on new columns
COMMENT ON COLUMN load_metadata.items_scanned_count IS 'Number of items that have been scanned/mapped';
COMMENT ON COLUMN load_metadata.items_total_count IS 'Total number of items in the load';
COMMENT ON COLUMN load_metadata.scanning_complete IS 'Whether all items have been scanned/mapped';
COMMENT ON COLUMN load_metadata.sanity_check_stage IS 'Stage of sanity check: early (grouping only) or final (full prep)';
COMMENT ON COLUMN load_metadata.sanity_check_parameters IS 'JSON parameters for what needs to be verified in the sanity check';
COMMENT ON COLUMN load_metadata.sanity_last_checked_at IS 'Timestamp of the last completed sanity check';
COMMENT ON COLUMN load_metadata.sanity_last_checked_by IS 'User who completed the last sanity check';
