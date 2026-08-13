create or replace function public.search_public_lost_animals_nearby(
  p_province text default null,
  p_district text default null,
  p_neighborhood text default null,
  p_limit integer default 8
)
returns table (
  id text,
  legacy_id text,
  species text,
  breed text,
  sex text,
  age text,
  color text,
  happened_at text,
  region text,
  address text,
  place text,
  description text,
  image text
)
language sql
stable
set search_path = public
as $$
  select
    a.id, a.legacy_id, a.species, a.breed, a.sex, a.age, a.color,
    a.happened_at, a.region, a.address, a.place, a.description, a.image
  from public.public_lost_animals a
  where a.active = true
  order by
    case
      when nullif(p_neighborhood, '') is not null
        and (a.region ilike '%' || p_neighborhood || '%' or a.address ilike '%' || p_neighborhood || '%') then 4
      when nullif(p_district, '') is not null
        and (a.region ilike '%' || p_district || '%' or a.address ilike '%' || p_district || '%') then 3
      when nullif(p_province, '') is not null
        and (a.region ilike '%' || p_province || '%' or a.address ilike '%' || p_province || '%') then 2
      else 1
    end desc,
    a.happened_at desc,
    a.id
  limit least(greatest(coalesce(p_limit, 8), 1), 20);
$$;

grant execute on function public.search_public_lost_animals_nearby(text, text, text, integer)
  to anon, authenticated, service_role;
