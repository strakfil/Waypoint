-- Waypoint · v0.1 schema
-- Run this in the Supabase SQL editor, or via `supabase db push`.

create extension if not exists postgis;

-- 1. Profiles -----------------------------------------------------------
create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  display_name text,
  avatar_url text,
  created_at timestamptz not null default now()
);

alter table public.profiles enable row level security;

create policy "Profiles are viewable by owner"
  on public.profiles for select
  using (auth.uid() = id);

create policy "Profiles are editable by owner"
  on public.profiles for update
  using (auth.uid() = id);

-- Auto-create a profile row whenever a new auth user signs up.
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, display_name)
  values (new.id, new.raw_user_meta_data->>'full_name');
  return new;
end;
$$ language plpgsql security definer;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- 2. Places ---------------------------------------------------------------
-- One table for every point of interest: water, sleeping spot, via ferrata,
-- hiking trailhead, or a custom entry. `source` distinguishes user-created
-- places from ones imported from OpenStreetMap.
create type public.place_type as enum (
  'water',
  'sleep_spot',
  'via_ferrata',
  'hiking',
  'custom'
);

create table if not exists public.places (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid references public.profiles (id) on delete set null,
  type public.place_type not null,
  name text not null,
  description text,
  location geography(point, 4326) not null,
  source text not null default 'user', -- 'user' | 'osm'
  osm_id text,
  created_at timestamptz not null default now()
);

create index if not exists places_location_idx on public.places using gist (location);
create index if not exists places_type_idx on public.places (type);

alter table public.places enable row level security;

create policy "Places are viewable by everyone"
  on public.places for select
  using (true);

create policy "Users can insert their own places"
  on public.places for insert
  with check (auth.uid() = owner_id);

create policy "Users can update their own places"
  on public.places for update
  using (auth.uid() = owner_id);

create policy "Users can delete their own places"
  on public.places for delete
  using (auth.uid() = owner_id);

-- 3. Ratings ---------------------------------------------------------------
create table if not exists public.ratings (
  id uuid primary key default gen_random_uuid(),
  place_id uuid not null references public.places (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  score smallint not null check (score between 1 and 5),
  comment text,
  created_at timestamptz not null default now(),
  unique (place_id, user_id)
);

alter table public.ratings enable row level security;

create policy "Ratings are viewable by everyone"
  on public.ratings for select
  using (true);

create policy "Users manage their own ratings"
  on public.ratings for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- 4. Lists / wishlists ------------------------------------------------------
create table if not exists public.lists (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references public.profiles (id) on delete cascade,
  name text not null,
  is_public boolean not null default false,
  created_at timestamptz not null default now()
);

create table if not exists public.list_items (
  list_id uuid not null references public.lists (id) on delete cascade,
  place_id uuid not null references public.places (id) on delete cascade,
  note text,
  added_at timestamptz not null default now(),
  primary key (list_id, place_id)
);

alter table public.lists enable row level security;
alter table public.list_items enable row level security;

create policy "Lists are viewable by owner or if public"
  on public.lists for select
  using (auth.uid() = owner_id or is_public);

create policy "Users manage their own lists"
  on public.lists for all
  using (auth.uid() = owner_id)
  with check (auth.uid() = owner_id);

create policy "List items follow parent list visibility"
  on public.list_items for select
  using (
    exists (
      select 1 from public.lists l
      where l.id = list_items.list_id
        and (l.owner_id = auth.uid() or l.is_public)
    )
  );

create policy "Users manage items in their own lists"
  on public.list_items for all
  using (
    exists (select 1 from public.lists l where l.id = list_items.list_id and l.owner_id = auth.uid())
  )
  with check (
    exists (select 1 from public.lists l where l.id = list_items.list_id and l.owner_id = auth.uid())
  );

-- 5. Trips & trip stops ------------------------------------------------------
create table if not exists public.trips (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references public.profiles (id) on delete cascade,
  name text not null,
  started_at timestamptz,
  created_at timestamptz not null default now()
);

create table if not exists public.trip_stops (
  id uuid primary key default gen_random_uuid(),
  trip_id uuid not null references public.trips (id) on delete cascade,
  place_id uuid references public.places (id) on delete set null,
  position int not null,
  status text not null default 'planned', -- 'planned' | 'active' | 'done'
  segment_rating smallint check (segment_rating between 1 and 5),
  segment_note text,
  unique (trip_id, position)
);

alter table public.trips enable row level security;
alter table public.trip_stops enable row level security;

create policy "Users manage their own trips"
  on public.trips for all
  using (auth.uid() = owner_id)
  with check (auth.uid() = owner_id);

create policy "Trip stops follow parent trip ownership"
  on public.trip_stops for all
  using (
    exists (select 1 from public.trips t where t.id = trip_stops.trip_id and t.owner_id = auth.uid())
  )
  with check (
    exists (select 1 from public.trips t where t.id = trip_stops.trip_id and t.owner_id = auth.uid())
  );
