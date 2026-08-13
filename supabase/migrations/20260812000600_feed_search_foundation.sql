-- 퍼스트프렌드 목록 검색 기반
-- 1단계: 기존 데이터를 보존하면서 검색·정렬용 파생 컬럼과 인덱스를 추가합니다.

alter table public.public_animals
  add column if not exists updated_at timestamptz,
  add column if not exists notice_start_at timestamptz,
  add column if not exists notice_end_at timestamptz,
  add column if not exists public_phase text;

-- 현재 updated 값은 '2026. 8. 12.' 형태의 텍스트입니다.
-- 변환 가능한 행만 백필하고, 변환되지 않는 행은 null로 남겨 후속 점검합니다.
update public.public_animals
set updated_at = to_date(
  regexp_replace(trim(updated), '[^0-9]+', '-', 'g'),
  'YYYY-FMMM-FMDD'
)::timestamptz
where updated_at is null
  and updated ~ '^\s*\d{4}\D+\d{1,2}\D+\d{1,2}';

create index if not exists idx_public_animals_feed_recent
  on public.public_animals (updated_at desc, id desc)
  where active = true;

create index if not exists idx_public_animals_feed_filter
  on public.public_animals (species, age_group, sex, updated_at desc, id desc)
  where active = true;

create index if not exists idx_public_animals_feed_breed
  on public.public_animals (up_kind_cd, kind_cd, updated_at desc, id desc)
  where active = true;

create index if not exists idx_public_animals_feed_shelter
  on public.public_animals (shelter_id, updated_at desc, id desc)
  where active = true;
