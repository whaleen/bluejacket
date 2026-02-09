ALTER TABLE public.settings
  ADD COLUMN IF NOT EXISTS last_sync_orders_at timestamptz;

COMMENT ON COLUMN public.settings.last_sync_orders_at IS 'Last successful orders sync timestamp';
