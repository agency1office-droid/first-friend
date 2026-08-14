-- 공공 API 체중은 보통 `2(Kg)`, `2.5 (Kg)`, `2kg`처럼 표기됩니다.
-- 기존 분류식이 괄호가 있는 표기를 읽지 못해 대부분 unknown으로 남던 문제를 보정합니다.
with normalized as (
  select
    id,
    species,
    lower(regexp_replace(coalesce(traits_json, ''), '\\(\\s*kg\\s*\\)', ' kg', 'gi')) as traits
  from public.public_animals
), parsed as (
  select
    id,
    species,
    nullif(substring(traits from '([0-9]+([.][0-9]+)?)\\s*kg'), '')::numeric as weight_kg
  from normalized
)
update public.public_animals as animals
set size_group = case
  when parsed.weight_kg is null then 'unknown'
  when parsed.species = '고양이' and parsed.weight_kg < 3 then 'small'
  when parsed.species = '고양이' and parsed.weight_kg < 6 then 'medium'
  when parsed.species = '고양이' and parsed.weight_kg < 10 then 'large'
  when parsed.species = '고양이' then 'xlarge'
  when parsed.weight_kg < 5 then 'small'
  when parsed.weight_kg < 15 then 'medium'
  when parsed.weight_kg < 30 then 'large'
  else 'xlarge'
end
from parsed
where animals.id = parsed.id;

create index if not exists idx_public_animals_feed_size_updated
  on public.public_animals (size_group, updated_at desc, id desc)
  where active = true;
