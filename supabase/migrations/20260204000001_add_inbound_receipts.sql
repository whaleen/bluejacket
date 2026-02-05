-- Inbound receipts (shipment-level) and line items

CREATE TABLE IF NOT EXISTS public.inbound_receipts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL,
  location_id uuid NOT NULL,
  inbound_shipment_no text NOT NULL,
  scac text,
  truck_number text,
  scheduled_arrival_date text,
  scheduled_arrival_time text,
  actual_arrival_time text,
  total_units integer,
  total_pc_units integer,
  seal_number text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS inbound_receipts_unique
  ON public.inbound_receipts(company_id, location_id, inbound_shipment_no);

CREATE TABLE IF NOT EXISTS public.inbound_receipt_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL,
  location_id uuid NOT NULL,
  inbound_shipment_no text NOT NULL,
  line_index integer NOT NULL,
  cso text,
  tracking_number text,
  model text,
  serial text,
  inbound_replacement text,
  qty integer,
  rcvd integer,
  short integer,
  damage integer,
  serial_mix text,
  raw_line text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS inbound_receipt_items_unique
  ON public.inbound_receipt_items(company_id, location_id, inbound_shipment_no, line_index);

CREATE INDEX IF NOT EXISTS inbound_receipt_items_serial_idx
  ON public.inbound_receipt_items(serial);

CREATE INDEX IF NOT EXISTS inbound_receipt_items_cso_idx
  ON public.inbound_receipt_items(cso);
