-- Hotfix: Remove strict FK constraint on inventory_item_id
-- Session items are snapshots and might not have live FK references

ALTER TABLE public.product_location_history
  DROP CONSTRAINT IF EXISTS product_location_history_inventory_item_fk;

-- Add comment explaining why no FK constraint
COMMENT ON COLUMN public.product_location_history.inventory_item_id IS 'Reference to inventory item (snapshot ID from session - no FK constraint as items may be deleted)';
