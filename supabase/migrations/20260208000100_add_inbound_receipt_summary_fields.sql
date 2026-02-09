ALTER TABLE public.inbound_receipts
  ADD COLUMN IF NOT EXISTS summary_units integer,
  ADD COLUMN IF NOT EXISTS summary_points integer,
  ADD COLUMN IF NOT EXISTS asn_row_count integer,
  ADD COLUMN IF NOT EXISTS units_gap integer;
