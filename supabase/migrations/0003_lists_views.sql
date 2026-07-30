-- Waypoint · v0.3 schema additions
-- Run this in the Supabase SQL editor after 0001_init.sql and 0002_places_view.sql.

-- Lists with a live item count, so the lists overview doesn't need a
-- separate query per list.
create or replace view public.lists_with_counts as
select
  l.id,
  l.owner_id,
  l.name,
  l.is_public,
  l.created_at,
  count(li.place_id) as item_count
from public.lists l
left join public.list_items li on li.list_id = l.id
group by l.id;

grant select on public.lists_with_counts to anon, authenticated;

-- List items joined with their place details (name, type, coordinates),
-- so a list detail page can render without N+1 queries.
create or replace view public.list_items_with_places as
select
  li.list_id,
  li.place_id,
  li.note,
  li.added_at,
  p.name,
  p.type,
  p.description,
  st_y(p.location::geometry) as lat,
  st_x(p.location::geometry) as lng,
  p.source,
  p.osm_id
from public.list_items li
join public.places p on p.id = li.place_id;

grant select on public.list_items_with_places to anon, authenticated;
