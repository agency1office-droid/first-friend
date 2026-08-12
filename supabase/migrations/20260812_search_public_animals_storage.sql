-- 기존 검색 RPC의 반환 형식은 유지하고 Storage 주소만 덧붙입니다.
-- 기존 함수를 교체하지 않아 이미 실행한 검색 기능과 호환됩니다.

create or replace function public.search_public_animals_with_storage(
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
  image_1 text, image_2 text, image_1_storage text, image_2_storage text,
  colors_json text, traits_json text, summary text, health_json text,
  life_json text, match_reason text, process_state text,
  distance_meters double precision, total_count bigint
)
language sql stable set search_path = public
as $$
  select r.id, r.name, r.species, r.breed, r.up_kind_cd, r.kind_cd,
    r.age, r.age_group, r.sex, r.region, r.shelter_id, r.shelter_name,
    r.shelter_address, r.shelter_phone, r.shelter_lat, r.shelter_lng,
    r.approximate_shelter_location, r.updated, r.updated_at, r.image_1,
    r.image_2, a.image_1_storage, a.image_2_storage, r.colors_json,
    r.traits_json, r.summary, r.health_json, r.life_json, r.match_reason,
    r.process_state, r.distance_meters, r.total_count
  from public.search_public_animals(
    p_limit, p_cursor_updated_at, p_cursor_id, p_cursor_distance_meters,
    p_lat, p_lng, p_sort, p_species, p_age_group, p_sex, p_kind_codes,
    p_color, p_public_phase, p_size_group, p_multiple_photos,
    p_exact_location, p_max_distance_meters
  ) r
  join public.public_animals a on a.id = r.id;
$$;

-- Supabase의 기본 함수 실행 권한으로 anon/authenticated가 읽을 수 있습니다.
-- 별도 GRANT는 환경별 함수 시그니처 차이로 SQL 전체가 실패할 수 있어 생략합니다.
