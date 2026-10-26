-- Housio schema. All tables live in the private "app" schema, which is not exposed
-- through the Data API. Row level security is enabled on every table with no
-- policies for anon/authenticated, so the only way in is through the audited
-- SECURITY DEFINER api_* functions in "public" that check the session and role.

create extension if not exists pgcrypto with schema extensions;
create extension if not exists citext with schema extensions;
create extension if not exists btree_gist with schema extensions;

create schema if not exists app;
revoke all on schema app from public, anon, authenticated;

create table app.accounts (
  id uuid primary key default extensions.gen_random_uuid(),
  email extensions.citext not null unique,
  password_hash text not null,
  role text not null check (role in ('guest','owner','admin')),
  display_name text not null check (length(display_name) between 1 and 80),
  phone text,
  is_demo boolean not null default false,
  is_protected boolean not null default false,
  status text not null default 'active' check (status in ('active','suspended')),
  created_at timestamptz not null default now(),
  last_login_at timestamptz
);

create table app.sessions (
  token_hash text primary key,
  account_id uuid not null references app.accounts(id) on delete cascade,
  created_at timestamptz not null default now(),
  last_seen_at timestamptz not null default now(),
  expires_at timestamptz not null
);
create index on app.sessions(account_id);

create table app.login_attempts (
  id bigserial primary key,
  identifier text not null,
  client_key text not null,
  attempted_at timestamptz not null default now()
);
create index on app.login_attempts(identifier, attempted_at);
create index on app.login_attempts(client_key, attempted_at);

create table app.owner_profiles (
  account_id uuid primary key references app.accounts(id) on delete cascade,
  business_name text not null,
  bio text,
  verification_status text not null default 'unverified' check (verification_status in ('unverified','pending','verified','rejected')),
  verified_at timestamptz,
  verified_by uuid references app.accounts(id)
);

create table app.neighbourhoods (
  slug text primary key,
  name text not null unique,
  city text not null default 'Nairobi',
  lat double precision not null,
  lon double precision not null
);

create table app.properties (
  id uuid primary key default extensions.gen_random_uuid(),
  slug text not null unique check (slug ~ '^[a-z0-9-]{3,80}$'),
  owner_id uuid not null references app.accounts(id),
  name text not null check (length(name) between 3 and 120),
  property_type text not null check (property_type in ('serviced_apartment','studio','holiday_home','furnished_home','suite','private_room','meeting_room','lounge','other')),
  neighbourhood text not null references app.neighbourhoods(slug),
  summary text not null default '',
  description text not null default '',
  anchor_lat double precision not null check (anchor_lat between -90 and 90),
  anchor_lon double precision not null check (anchor_lon between -180 and 180),
  anchor_is_exact boolean not null default false,
  anchor_note text not null default 'Representative location within the neighbourhood, not a street address.',
  cancellation_policy text not null default 'moderate' check (cancellation_policy in ('flexible','moderate','strict')),
  stay_types text[] not null default array['short'] check (stay_types <@ array['short','long']),
  house_rules text not null default '',
  status text not null default 'draft' check (status in ('draft','pending_review','published','rejected','archived')),
  review_note text,
  is_demo boolean not null default false,
  seed_key text unique,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  published_at timestamptz
);
create index on app.properties(neighbourhood);
create index on app.properties(owner_id);
create index on app.properties(status);

create table app.units (
  id uuid primary key default extensions.gen_random_uuid(),
  property_id uuid not null references app.properties(id) on delete cascade,
  parent_unit_id uuid references app.units(id) on delete cascade,
  code text not null check (code ~ '^[A-Z0-9-]{2,20}$'),
  name text not null,
  unit_type text not null check (unit_type in ('apartment','studio','suite','house','room','meeting_room','lounge','facility')),
  max_guests int not null check (max_guests between 1 and 30),
  bedrooms int check (bedrooms between 0 and 20),
  bathrooms numeric(3,1) check (bathrooms between 0 and 20),
  sleeping jsonb not null default '[]'::jsonb,
  floor_area_m2 numeric(7,1) check (floor_area_m2 > 0),
  floor_area_verified boolean not null default false,
  floor_level int,
  currency text not null default 'KES' check (currency = 'KES'),
  nightly_rate int not null check (nightly_rate between 500 and 2000000),
  weekly_discount_pct int not null default 0 check (weekly_discount_pct between 0 and 50),
  monthly_discount_pct int not null default 0 check (monthly_discount_pct between 0 and 70),
  cleaning_fee int not null default 0 check (cleaning_fee between 0 and 200000),
  deposit int not null default 0 check (deposit between 0 and 2000000),
  min_nights int not null default 1 check (min_nights between 1 and 365),
  max_nights int not null default 180 check (max_nights between 1 and 365),
  is_bookable boolean not null default true,
  scene_style text not null default 'warm' check (scene_style in ('warm','contemporary','garden','minimal','classic')),
  unique (property_id, code)
);
create index on app.units(property_id);

create table app.spaces (
  id uuid primary key default extensions.gen_random_uuid(),
  unit_id uuid not null references app.units(id) on delete cascade,
  name text not null,
  kind text not null check (kind in ('living','bedroom','kitchen','bathroom','dining','balcony','office','hallway','meeting','lounge','garden')),
  sort int not null default 0,
  plan_x numeric(6,2) not null default 0,
  plan_z numeric(6,2) not null default 0,
  width_m numeric(5,2) not null check (width_m > 0),
  depth_m numeric(5,2) not null check (depth_m > 0),
  height_m numeric(4,2) not null default 2.7,
  dimensions_verified boolean not null default false,
  features jsonb not null default '{}'::jsonb,
  -- A space is never bookable by itself. When an owner offers part of a unit
  -- separately it is modelled as its own child unit and linked here.
  separately_bookable_unit_id uuid references app.units(id) on delete set null
);
create index on app.spaces(unit_id);

create table app.amenities (
  code text primary key,
  label text not null,
  category text not null
);

create table app.unit_amenities (
  unit_id uuid not null references app.units(id) on delete cascade,
  amenity_code text not null references app.amenities(code),
  value text not null check (value in ('yes','no','unknown')),
  detail text,
  info_source text not null default 'owner' check (info_source in ('owner','verified')),
  primary key (unit_id, amenity_code)
);

create table app.assets (
  id uuid primary key default extensions.gen_random_uuid(),
  property_id uuid not null references app.properties(id) on delete cascade,
  unit_id uuid references app.units(id) on delete cascade,
  space_id uuid references app.spaces(id) on delete set null,
  kind text not null check (kind in ('photo','model','floor_plan','texture','render')),
  trust_label text not null check (trust_label in ('actual_photo','verified_model','illustrative_model','illustrative_render','owner_floor_plan')),
  url text,
  mime text,
  bytes int,
  caption text not null default '',
  source text not null default 'owner',
  licence text,
  sort int not null default 0,
  created_at timestamptz not null default now()
);
create index on app.assets(property_id);

create table app.asset_files (
  asset_id uuid primary key references app.assets(id) on delete cascade,
  data bytea not null check (octet_length(data) <= 4194304)
);

create table app.availability_blocks (
  id uuid primary key default extensions.gen_random_uuid(),
  unit_id uuid not null references app.units(id) on delete cascade,
  stay daterange not null check (not isempty(stay)),
  reason text not null default 'owner_block',
  created_at timestamptz not null default now(),
  exclude using gist (unit_id with =, stay with &&)
);

create table app.rate_overrides (
  id uuid primary key default extensions.gen_random_uuid(),
  unit_id uuid not null references app.units(id) on delete cascade,
  stay daterange not null check (not isempty(stay)),
  nightly_rate int not null check (nightly_rate between 500 and 2000000),
  exclude using gist (unit_id with =, stay with &&)
);

create table app.bookings (
  id uuid primary key default extensions.gen_random_uuid(),
  reference text not null unique,
  unit_id uuid not null references app.units(id),
  guest_id uuid not null references app.accounts(id),
  stay daterange not null check (not isempty(stay) and lower_inc(stay) and not upper_inc(stay)),
  guests int not null check (guests between 1 and 30),
  status text not null default 'pending' check (status in ('pending','confirmed','cancelled','completed','expired','payment_failed')),
  nights int not null,
  subtotal int not null,
  discount int not null,
  cleaning_fee int not null,
  service_fee int not null,
  total int not null,
  deposit int not null,
  refund_amount int,
  currency text not null default 'KES',
  cancellation_policy text not null,
  is_demo boolean not null,
  payment_mode text not null check (payment_mode in ('demo_simulated','provider')),
  expires_at timestamptz,
  created_at timestamptz not null default now(),
  confirmed_at timestamptz,
  cancelled_at timestamptz,
  -- The database refuses two live bookings for the same unit on overlapping nights.
  constraint bookings_no_overlap exclude using gist (unit_id with =, stay with &&)
    where (status in ('pending','confirmed','completed'))
);
create index on app.bookings(guest_id);
create index on app.bookings(unit_id);

create table app.booking_guests (
  id bigserial primary key,
  booking_id uuid not null references app.bookings(id) on delete cascade,
  full_name text not null check (length(full_name) between 1 and 100)
);

create table app.payments (
  id uuid primary key default extensions.gen_random_uuid(),
  booking_id uuid not null references app.bookings(id) on delete cascade,
  mode text not null,
  outcome text not null check (outcome in ('succeeded','failed','refunded')),
  amount int not null,
  created_at timestamptz not null default now()
);

create table app.reviews (
  id uuid primary key default extensions.gen_random_uuid(),
  booking_id uuid not null unique references app.bookings(id),
  property_id uuid not null references app.properties(id) on delete cascade,
  author_id uuid not null references app.accounts(id),
  rating int not null check (rating between 1 and 5),
  body text not null check (length(body) between 10 and 2000),
  status text not null default 'pending' check (status in ('pending','published','rejected')),
  moderated_by uuid references app.accounts(id),
  created_at timestamptz not null default now()
);

create table app.nearby_places (
  id uuid primary key default extensions.gen_random_uuid(),
  property_id uuid not null references app.properties(id) on delete cascade,
  name text not null,
  category text not null check (category in ('restaurant','hospital','pharmacy','shopping','transport','education','fitness','park','business')),
  subtype text,
  lat double precision not null,
  lon double precision not null,
  distance_m int not null check (distance_m >= 0),
  distance_kind text not null default 'straight_line' check (distance_kind in ('straight_line','route')),
  source_provider text not null,
  source_id text not null,
  source_url text not null check (source_url ~ '^https://'),
  licence text not null,
  retrieved_at timestamptz not null,
  address text,
  phone text,
  website text,
  opening_hours text,
  verification_status text not null default 'source_listed' check (verification_status in ('source_listed','verified','stale')),
  unique (property_id, source_id)
);
create index on app.nearby_places(property_id);

create table app.verification_records (
  id uuid primary key default extensions.gen_random_uuid(),
  entity_type text not null,
  entity_id uuid not null,
  field text not null,
  status text not null check (status in ('owner_provided','verified','illustrative','demo')),
  method text not null,
  notes text,
  verified_by uuid references app.accounts(id),
  created_at timestamptz not null default now()
);
create index on app.verification_records(entity_id);

create table app.collections (
  id uuid primary key default extensions.gen_random_uuid(),
  owner_id uuid not null references app.accounts(id) on delete cascade,
  name text not null check (length(name) between 1 and 80),
  share_token text not null unique default encode(extensions.gen_random_bytes(12), 'hex'),
  created_at timestamptz not null default now()
);

create table app.collection_items (
  collection_id uuid not null references app.collections(id) on delete cascade,
  property_id uuid not null references app.properties(id) on delete cascade,
  note text,
  added_at timestamptz not null default now(),
  primary key (collection_id, property_id)
);

create table app.collection_votes (
  collection_id uuid not null references app.collections(id) on delete cascade,
  property_id uuid not null references app.properties(id) on delete cascade,
  voter_id uuid not null references app.accounts(id) on delete cascade,
  vote int not null check (vote in (-1, 1)),
  primary key (collection_id, property_id, voter_id)
);

create table app.notifications (
  id bigserial primary key,
  account_id uuid not null references app.accounts(id) on delete cascade,
  kind text not null,
  message text not null,
  link text,
  read_at timestamptz,
  created_at timestamptz not null default now()
);
create index on app.notifications(account_id, created_at desc);

create table app.audit_logs (
  id bigserial primary key,
  actor_id uuid,
  actor_role text,
  action text not null,
  target_type text,
  target_id text,
  details jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

do $$ declare t text; begin
  for t in select tablename from pg_tables where schemaname = 'app' loop
    execute format('alter table app.%I enable row level security', t);
    execute format('revoke all on app.%I from public, anon, authenticated', t);
  end loop;
end $$;
