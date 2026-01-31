-- Fog of War Map: Genesis points, beacons, and product location tracking
-- Genesis point establishes coordinate system for each location
-- All positions stored as relative x,y meters from genesis point

-- Location genesis points (first scan establishes coordinate origin)
CREATE TABLE public.location_genesis_points (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  location_id uuid NOT NULL,
  genesis_lat numeric NOT NULL,
  genesis_lng numeric NOT NULL,
  genesis_scan_id uuid,
  established_at timestamp with time zone DEFAULT now(),
  established_by text,
  CONSTRAINT location_genesis_points_pkey PRIMARY KEY (id),
  CONSTRAINT location_genesis_points_location_unique UNIQUE (location_id),
  CONSTRAINT location_genesis_points_location_fk FOREIGN KEY (location_id) REFERENCES public.locations(id) ON DELETE CASCADE
);

COMMENT ON TABLE public.location_genesis_points IS 'Origin point (0,0) for each warehouse location. First scan establishes coordinate system.';
COMMENT ON COLUMN public.location_genesis_points.genesis_lat IS 'Latitude of first scan (GPS origin point)';
COMMENT ON COLUMN public.location_genesis_points.genesis_lng IS 'Longitude of first scan (GPS origin point)';
COMMENT ON COLUMN public.location_genesis_points.genesis_scan_id IS 'Reference to the first product_location_history record';

-- Beacons (future: two-word names like VELVET-HAMMER)
CREATE TABLE public.beacons (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  company_id uuid NOT NULL,
  location_id uuid NOT NULL,
  name text NOT NULL,
  position_x numeric NOT NULL,
  position_y numeric NOT NULL,
  icon text,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT beacons_pkey PRIMARY KEY (id),
  CONSTRAINT beacons_location_name_unique UNIQUE (location_id, name),
  CONSTRAINT beacons_company_fk FOREIGN KEY (company_id) REFERENCES public.companies(id) ON DELETE CASCADE,
  CONSTRAINT beacons_location_fk FOREIGN KEY (location_id) REFERENCES public.locations(id) ON DELETE CASCADE
);

COMMENT ON TABLE public.beacons IS 'Physical beacon positions for future indoor positioning. Uses two-word names (e.g., VELVET-HAMMER).';
COMMENT ON COLUMN public.beacons.position_x IS 'X coordinate in meters from genesis point';
COMMENT ON COLUMN public.beacons.position_y IS 'Y coordinate in meters from genesis point';
COMMENT ON COLUMN public.beacons.icon IS 'Lucide icon name for map display';

CREATE INDEX beacons_location_id_idx ON public.beacons(location_id);

-- Product location tracking (scan history with positions)
CREATE TABLE public.product_location_history (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  company_id uuid NOT NULL,
  location_id uuid NOT NULL,
  product_id uuid,
  inventory_item_id uuid,
  scanning_session_id uuid,
  position_x numeric NOT NULL,
  position_y numeric NOT NULL,
  position_source text NOT NULL DEFAULT 'gps' CHECK (position_source IN ('gps', 'beacon')),
  beacon_id uuid,
  raw_lat numeric,
  raw_lng numeric,
  accuracy numeric,
  scanned_by text,
  product_type text,
  sub_inventory text,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT product_location_history_pkey PRIMARY KEY (id),
  CONSTRAINT product_location_history_company_fk FOREIGN KEY (company_id) REFERENCES public.companies(id) ON DELETE CASCADE,
  CONSTRAINT product_location_history_location_fk FOREIGN KEY (location_id) REFERENCES public.locations(id) ON DELETE CASCADE,
  CONSTRAINT product_location_history_product_fk FOREIGN KEY (product_id) REFERENCES public.products(id) ON DELETE SET NULL,
  -- NOTE: No FK on inventory_item_id - session items are snapshots and may not have live references
  CONSTRAINT product_location_history_session_fk FOREIGN KEY (scanning_session_id) REFERENCES public.scanning_sessions(id) ON DELETE SET NULL,
  CONSTRAINT product_location_history_beacon_fk FOREIGN KEY (beacon_id) REFERENCES public.beacons(id) ON DELETE SET NULL
);

COMMENT ON TABLE public.product_location_history IS 'History of product scans with position data. Enables fog of war heat map visualization.';
COMMENT ON COLUMN public.product_location_history.position_x IS 'X coordinate in meters from genesis point';
COMMENT ON COLUMN public.product_location_history.position_y IS 'Y coordinate in meters from genesis point';
COMMENT ON COLUMN public.product_location_history.position_source IS 'Source of position data: gps (v1) or beacon (future)';
COMMENT ON COLUMN public.product_location_history.inventory_item_id IS 'Reference to inventory item (snapshot ID from session - no FK constraint as items may be deleted)';
COMMENT ON COLUMN public.product_location_history.raw_lat IS 'Original GPS latitude for debugging';
COMMENT ON COLUMN public.product_location_history.raw_lng IS 'Original GPS longitude for debugging';
COMMENT ON COLUMN public.product_location_history.accuracy IS 'GPS accuracy in meters';
COMMENT ON COLUMN public.product_location_history.product_type IS 'Snapshot of product type at scan time (e.g., REFRIGERATOR, WASHER)';
COMMENT ON COLUMN public.product_location_history.sub_inventory IS 'Snapshot of load/sub_inventory at scan time for color mapping';

CREATE INDEX product_location_history_location_id_idx ON public.product_location_history(location_id);
CREATE INDEX product_location_history_session_id_idx ON public.product_location_history(scanning_session_id);
CREATE INDEX product_location_history_created_at_idx ON public.product_location_history(created_at DESC);
CREATE INDEX product_location_history_inventory_item_idx ON public.product_location_history(inventory_item_id);

-- Add foreign key constraint from genesis points to product_location_history
-- (done after product_location_history table exists)
ALTER TABLE public.location_genesis_points
  ADD CONSTRAINT location_genesis_points_scan_fk
  FOREIGN KEY (genesis_scan_id)
  REFERENCES public.product_location_history(id)
  ON DELETE SET NULL;
