-- WARNING: This schema is for context only and is not meant to be run.
-- Table order and constraints may not be valid for execution.

CREATE TABLE public.customers (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  customer_name text NOT NULL,
  address text,
  phone text,
  email text,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT customers_pkey PRIMARY KEY (id)
);
CREATE TABLE public.deliveries (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  date date NOT NULL,
  truck_id text NOT NULL,
  stop integer NOT NULL,
  cso text NOT NULL,
  consumer_customer_name text NOT NULL,
  model text NOT NULL,
  qty integer NOT NULL DEFAULT 1,
  serial text,
  product_type text NOT NULL,
  status text NOT NULL DEFAULT 'PENDING'::text,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  scanned boolean DEFAULT false,
  truck_fk uuid,
  customer_fk uuid,
  product_fk uuid,
  marked_for_truck boolean DEFAULT false,
  staged boolean DEFAULT false,
  CONSTRAINT deliveries_pkey PRIMARY KEY (id),
  CONSTRAINT fk_deliveries_truck FOREIGN KEY (truck_fk) REFERENCES public.trucks(id),
  CONSTRAINT fk_deliveries_customer FOREIGN KEY (customer_fk) REFERENCES public.customers(id),
  CONSTRAINT fk_deliveries_product FOREIGN KEY (product_fk) REFERENCES public.products(id)
);
CREATE TABLE public.inventory_conversions (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  inventory_item_id uuid NOT NULL,
  from_inventory_type text NOT NULL,
  to_inventory_type text NOT NULL,
  from_sub_inventory text,
  to_sub_inventory text,
  converted_by text,
  notes text,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT inventory_conversions_pkey PRIMARY KEY (id),
  CONSTRAINT fk_conversion_item FOREIGN KEY (inventory_item_id) REFERENCES public.inventory_items(id)
);
CREATE TABLE public.inventory_items (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  date date,
  route_id text,
  stop integer,
  cso text NOT NULL,
  consumer_customer_name text,
  model text NOT NULL,
  qty integer DEFAULT 1,
  serial text,
  product_type text NOT NULL,
  status text,
  inventory_type text NOT NULL,
  sub_inventory text,
  is_scanned boolean DEFAULT false,
  scanned_at timestamp with time zone,
  scanned_by text,
  notes text,
  product_fk uuid,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT inventory_items_pkey PRIMARY KEY (id),
  CONSTRAINT fk_inventory_product FOREIGN KEY (product_fk) REFERENCES public.products(id)
);
CREATE TABLE public.load_metadata (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  inventory_type text NOT NULL,
  sub_inventory_name text NOT NULL,
  status text NOT NULL DEFAULT 'active'::text CHECK (status = ANY (ARRAY['active'::text, 'staged'::text, 'in_transit'::text, 'delivered'::text])),
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  created_by text,
  notes text,
  category text,
  CONSTRAINT load_metadata_pkey PRIMARY KEY (id)
);
CREATE TABLE public.products (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  model text NOT NULL UNIQUE,
  product_type text NOT NULL,
  brand text,
  description text,
  dimensions jsonb,
  created_at timestamp with time zone DEFAULT now(),
  image_url text,
  product_url text,
  price numeric,
  msrp numeric,
  color text,
  capacity text,
  availability text,
  commercial_category text,
  specs jsonb,
  updated_at timestamp with time zone DEFAULT now(),
  product_category text CHECK (product_category = ANY (ARRAY['appliance'::text, 'part'::text, 'accessory'::text])),
  is_part boolean DEFAULT false,
  CONSTRAINT products_pkey PRIMARY KEY (id)
);
CREATE TABLE public.trucks (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  truck_id text NOT NULL UNIQUE,
  driver_name text,
  capacity integer DEFAULT 50,
  active boolean DEFAULT true,
  created_at timestamp with time zone DEFAULT now(),
  abbreviated_name text UNIQUE,
  color text DEFAULT '#3B82F6'::text,
  CONSTRAINT trucks_pkey PRIMARY KEY (id)
);
CREATE TABLE public.users (
  id bigint GENERATED ALWAYS AS IDENTITY NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  username character varying UNIQUE,
  password character varying,
  image character varying,
  CONSTRAINT users_pkey PRIMARY KEY (id)
);