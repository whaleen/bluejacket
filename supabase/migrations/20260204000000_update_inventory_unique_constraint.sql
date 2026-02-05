-- Update unique constraint to include inventory_type

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'inventory_items_company_location_serial_key'
  ) THEN
    ALTER TABLE inventory_items
      DROP CONSTRAINT inventory_items_company_location_serial_key;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'inventory_items_company_location_serial_type_key'
  ) THEN
    ALTER TABLE inventory_items
      ADD CONSTRAINT inventory_items_company_location_serial_type_key
      UNIQUE (company_id, location_id, serial, inventory_type);
  END IF;
END $$;
