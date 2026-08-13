-- 좌표가 없는 동물(NULL 거리)을 마지막 페이지까지 누락하지 않도록 보정합니다.
-- 거리 있는 행을 모두 보여준 뒤 NULL 거리 행은 id 커서로 이어갑니다.
create or replace function public.search_public_animals(
  p_limit integer default 20,
  p_cursor_updated_at timestamptz default null,
  p_cursor_id text default null,
  p_cursor_distance_meters double precision default null,
  p_lat double precision default null,
  p_lng double precision default null,
  p_sort text default 'recent',
  p_species text default null,
  p_age_group text default null,
  p_sex text default null,
  p_kind_codes text[] default null,
  p_color text default null,
  p_public_phase text default null,
  p_size_group text default null,
  p_multiple_photos boolean default false,
  p_exact_location boolean default false,
  p_max_distance_meters double precision default null
)
returns table (
  id text, name text, species text, breed text, up_kind_cd text, kind_cd text,
  age text, age_group text, sex text, region text, shelter_id text,
  shelter_name text, shelter_address text, shelter_phone text,
  shelter_lat double precision, shelter_lng double precision,
  approximate_shelter_location boolean, updated text, updated_at timestamptz,
  image_1 text, image_2 text, colors_json text, traits_json text,
  summary text, health_json text, life_json text, match_reason text,
  process_state text, distance_meters double precision, total_count bigint
)
language sql stable set search_path = public
as $$
with calculated as (
  select a.*, case
    when p_lat between -90 and 90 and p_lng between -180 and 180
      and a.shelter_lat between -90 and 90 and a.shelter_lng between -180 and 180
      and not a.approximate_shelter_location
    then 6371000.0 * 2.0 * asin(sqrt(
      power(sin(radians(a.shelter_lat - p_lat) / 2.0), 2)
      + cos(radians(p_lat)) * cos(radians(a.shelter_lat))
      * power(sin(radians(a.shelter_lng - p_lng) / 2.0), 2)
    )) else null end as calculated_distance
  from public.public_animals a
  where a.active = true
    and (p_species is null or a.species = p_species)
    and (p_age_group is null or a.age_group = p_age_group)
    and (p_sex is null or a.sex = p_sex)
    and (p_kind_codes is null or cardinality(p_kind_codes) = 0 or a.kind_cd = any(p_kind_codes))
    and (p_color is null or a.color_search like '%' || lower(p_color) || '%')
    and (p_public_phase is null or a.public_phase = p_public_phase)
    and (p_size_group is null or a.size_group = p_size_group)
    and (not p_multiple_photos or a.has_multiple_photos)
    and (not p_exact_location or a.has_exact_location)
), filtered as (
  select * from calculated c
  where (p_max_distance_meters is null or c.calculated_distance <= p_max_distance_meters)
    and ((p_sort = 'distance' and (
      p_cursor_distance_meters is null
      or (p_cursor_distance_meters < 1e15 and (
        coalesce(c.calculated_distance, 1e15) > p_cursor_distance_meters
        or (coalesce(c.calculated_distance, 1e15) = p_cursor_distance_meters
          and c.id > coalesce(p_cursor_id, ''))
      ))
      or (p_cursor_distance_meters >= 1e15 and c.calculated_distance is null
        and c.id > coalesce(p_cursor_id, ''))
    )) or (p_sort <> 'distance' and (
      p_cursor_updated_at is null
      or c.updated_at < p_cursor_updated_at
      or (c.updated_at = p_cursor_updated_at and c.id < coalesce(p_cursor_id, ''))
    )))
), counted as (
  select f.*, count(*) over () as result_count from filtered f
)
select c.id, c.name, c.species, c.breed, c.up_kind_cd, c.kind_cd,
  c.age, c.age_group, c.sex, c.region, c.shelter_id, c.shelter_name,
  c.shelter_address, c.shelter_phone, c.shelter_lat::double precision,
  c.shelter_lng::double precision, c.approximate_shelter_location,
  c.updated, c.updated_at, c.image_1, c.image_2, c.colors_json,
  c.traits_json, c.summary, c.health_json, c.life_json, c.match_reason,
  c.process_state, c.calculated_distance, c.result_count
from counted c
order by case when p_sort = 'distance' then coalesce(c.calculated_distance, 1e15) end asc,
  case when p_sort <> 'distance' then c.updated_at end desc,
  c.id asc
limit least(greatest(coalesce(p_limit, 20), 1), 50);
$$;
