create table if not exists public.orders (
  cso text not null,
  company_id uuid not null,
  location_id uuid not null,
  order_type text,
  order_date date,
  customer_name text,
  customer_account text,
  customer_phone text,
  freight_terms text,
  shipping_instructions text,
  shipping_method text,
  additional_service text,
  points numeric,
  last_seen_at timestamptz not null default now(),
  source text not null default 'ge_dms_orderdata',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (cso, location_id)
);

create table if not exists public.order_deliveries (
  delivery_id text not null,
  cso text not null,
  company_id uuid not null,
  location_id uuid not null,
  delivery_status text,
  cso_type text,
  customer_po_number text,
  rap text,
  zip_group text,
  delivery_date date,
  delivery_name text,
  delivery_address_1 text,
  delivery_address_2 text,
  delivery_city text,
  delivery_state text,
  delivery_zip text,
  delivery_phone jsonb,
  last_updated_date timestamptz,
  last_seen_at timestamptz not null default now(),
  source text not null default 'ge_dms_orderdata',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (delivery_id, cso, location_id)
);

create table if not exists public.order_lines (
  cso text not null,
  delivery_id text not null,
  line_number text not null,
  company_id uuid not null,
  location_id uuid not null,
  line_status text,
  line_type text,
  item_type text,
  item text,
  product_type text,
  crated_indicator text,
  anti_tip_indicator text,
  product_weight integer,
  nmfc text,
  carton_code text,
  quantity integer,
  points numeric,
  shipment_number text,
  customer_tracking_number text,
  serials jsonb,
  last_seen_at timestamptz not null default now(),
  source text not null default 'ge_dms_orderdata',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (cso, delivery_id, line_number, location_id)
);

create index if not exists orders_location_date_idx
  on public.orders (location_id, order_date);

create index if not exists order_deliveries_location_date_idx
  on public.order_deliveries (location_id, delivery_date);

create index if not exists order_lines_location_cso_idx
  on public.order_lines (location_id, cso);
