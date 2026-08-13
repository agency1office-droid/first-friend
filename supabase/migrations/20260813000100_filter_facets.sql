-- 필터 화면에서 public_animals 원본 행을 최대 10,000건 읽지 않도록
-- 동기화된 공개 데이터에서 facet 목록과 개수를 DB에서 한 번에 집계합니다.
create or replace function public.get_public_animal_filter_options()
returns jsonb
language sql
stable
security definer
set search_path = public
as $$
with active as (
  select * from public.public_animals where active = true
),
breeds as (
  select up_kind_cd || ':' || kind_cd as key, max(breed) as label, max(species) as species, count(*)::integer as count
  from active
  group by up_kind_cd, kind_cd
),
colors as (
  select distinct value
  from active a
  cross join lateral jsonb_array_elements_text(
    case when jsonb_typeof(a.colors_json::jsonb) = 'array' then a.colors_json::jsonb else '[]'::jsonb end
  ) as item(value)
  where value <> ''
),
weights as (
  select distinct value
  from active a
  cross join lateral jsonb_array_elements_text(
    case when jsonb_typeof(a.traits_json::jsonb) = 'array' then a.traits_json::jsonb else '[]'::jsonb end
  ) as item(value)
  where value ilike '%kg%'
)
select jsonb_build_object(
  'species', coalesce((select jsonb_agg(value order by value) from (select distinct species as value from active where species <> '') q), '[]'::jsonb),
  'breeds', coalesce((select jsonb_agg(to_jsonb(b) order by b.count desc, b.label) from breeds b), '[]'::jsonb),
  'sex', coalesce((select jsonb_agg(value order by value) from (select distinct sex as value from active where sex <> '') q), '[]'::jsonb),
  'colors', coalesce((select jsonb_agg(value order by value) from colors), '[]'::jsonb),
  'ages', coalesce((select jsonb_agg(value order by value) from (select distinct age as value from active where age <> '') q), '[]'::jsonb),
  'weights', coalesce((select jsonb_agg(value order by value) from weights), '[]'::jsonb),
  'states', coalesce((select jsonb_agg(value order by value) from (select distinct process_state as value from active where process_state <> '') q), '[]'::jsonb),
  'regions', coalesce((select jsonb_agg(value order by value) from (select distinct region as value from active where region <> '') q), '[]'::jsonb)
);
$$;

revoke all on function public.get_public_animal_filter_options() from public;
grant execute on function public.get_public_animal_filter_options() to anon, authenticated, service_role;
