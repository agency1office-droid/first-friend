-- 공개 검색은 활성 공고만 대상으로 하므로 부분 인덱스로 스캔 범위를 줄입니다.
create index if not exists idx_public_animals_active_recent
  on public.public_animals (updated_at desc, id)
  where active = true;

create index if not exists idx_public_animals_active_species
  on public.public_animals (species, updated_at desc, id)
  where active = true;

create index if not exists idx_public_animals_active_kind
  on public.public_animals (up_kind_cd, kind_cd, updated_at desc, id)
  where active = true;

create index if not exists idx_public_animals_active_sex
  on public.public_animals (sex, updated_at desc, id)
  where active = true;

create index if not exists idx_public_animals_active_region
  on public.public_animals (region, updated_at desc, id)
  where active = true;

create index if not exists idx_public_animals_active_shelter
  on public.public_animals (shelter_id, updated_at desc, id)
  where active = true;

create index if not exists idx_public_lost_animals_active_recent
  on public.public_lost_animals (happened_at desc, id)
  where active = true;
