-- Waypoint · v0.2 schema additions
-- Run this in the Supabase SQL editor after 0001_init.sql.

-- A flat view exposing lat/lng (instead of raw PostGIS geography) plus
-- aggregated rating, so the client can query it directly with the
-- Supabase JS client without needing PostGIS-aware parsing.
create or replace view public.places_with_ratings as
select
  p.id,
  p.owner_id,
  p.type,
  p.name,
  p.description,
  st_y(p.location::geometry) as lat,
  st_x(p.location::geometry) as lng,
  p.source,
  p.osm_id,
  p.created_at,
  round(avg(r.score)::numeric, 1) as avg_rating,
  count(r.id) as rating_count
from public.places p
left join public.ratings r on r.place_id = p.id
group by p.id;

-- Views don't inherit RLS from their base tables automatically for all
-- Postgres/PostgREST versions, so make sure this one is still readable
-- by everyone, matching the `places` select policy.
grant select on public.places_with_ratings to anon, authenticated;

-- RPC to insert a place from lat/lng, since building a `geography(point)`
-- literal from the client is awkward through the REST/JS client directly.
create or replace function public.insert_place(
  p_type public.place_type,
  p_name text,
  p_description text,
  p_lat double precision,
  p_lng double precision,
  p_source text default 'user',
  p_osm_id text default null
)
returns public.places
language plpgsql
security invoker
as $$
declare
  new_place public.places;
begin
  insert into public.places (owner_id, type, name, description, location, source, osm_id)
  values (
    auth.uid(),
    p_type,
    p_name,
    p_description,
    geography(st_setsrid(st_makepoint(p_lng, p_lat), 4326)),
    p_source,
    p_osm_id
  )
  returning * into new_place;

  return new_place;
end;
$$;

-- RPC to upsert a rating (insert or update the caller's own rating for a place).
create or replace function public.rate_place(
  p_place_id uuid,
  p_score smallint,
  p_comment text default null
)
returns public.ratings
language plpgsql
security invoker
as $$
declare
  new_rating public.ratings;
begin
  insert into public.ratings (place_id, user_id, score, comment)
  values (p_place_id, auth.uid(), p_score, p_comment)
  on conflict (place_id, user_id)
  do update set score = excluded.score, comment = excluded.comment
  returning * into new_rating;

  return new_rating;
end;
$$;
