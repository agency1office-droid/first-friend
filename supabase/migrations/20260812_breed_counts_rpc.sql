-- 품종 필터 개수 집계 RPC
create or replace function public.count_public_animal_breeds(
  p_species text default null,
  p_age_group text default null,
  p_sex text default null,
  p_size_group text default null,
  p_public_phase text default null,
  p_lat double precision default null,
  p_lng double precision default null,
  p_max_distance_meters double precision default null
)
returns table (up_kind_cd text, kind_cd text, kind_name text, species text, animal_count bigint)
language sql stable set search_path = public
as $$
with filtered as (
  select a.*,
    case when p_lat between -90 and 90 and p_lng between -180 and 180 and a.shelter_lat between -90 and 90 and a.shelter_lng between -180 and 180 and not a.approximate_shelter_location then 6371000.0 * 2.0 * asin(sqrt(power(sin(radians(a.shelter_lat - p_lat) / 2.0), 2) + cos(radians(p_lat)) * cos(radians(a.shelter_lat)) * power(sin(radians(a.shelter_lng - p_lng) / 2.0), 2))) else null end as distance_meters
  from public.public_animals a
  where a.active = true and (p_species is null or a.species = p_species) and (p_age_group is null or a.age_group = p_age_group) and (p_sex is null or a.sex = p_sex) and (p_size_group is null or a.size_group = p_size_group) and (p_public_phase is null or a.public_phase = p_public_phase)
)
select f.up_kind_cd, f.kind_cd, max(f.breed), f.species, count(*) from filtered f where p_max_distance_meters is null or f.distance_meters <= p_max_distance_meters group by f.up_kind_cd, f.kind_cd, f.species;
$$;

grant execute on function public.count_public_animal_breeds(text,text,text,text,text,double precision,double precision,double precision) to anon, authenticated, service_role;
