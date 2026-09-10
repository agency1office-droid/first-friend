-- 실종 동물 노출을 사용자의 생활권(시·군·구) 안으로 제한하고 신선도 기준을 적용합니다.
alter table public.public_lost_animals
  add column if not exists happened_on date;

create index if not exists idx_public_lost_animals_active_happened_on
  on public.public_lost_animals (active, happened_on desc);

-- 인자 이름이 바뀌므로 기존 함수를 먼저 제거합니다.
drop function if exists public.search_public_lost_animals_nearby(text, text, text, integer);

create or replace function public.search_public_lost_animals_nearby(
  p_provinces text[] default null,
  p_prefix text default null,
  p_dong text default null,
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
  with scoped as (
    select
      a.*,
      -- 관할 기관명이 아니라 실제 발생 주소를 기준으로 판정합니다.
      coalesce(nullif(btrim(a.address), ''), a.region) as source
    from public.public_lost_animals a
    where a.active = true
      -- 아직 동기화되지 않은 행은 통과시키되 정렬에서 뒤로 보냅니다.
      and (a.happened_on is null or a.happened_on >= current_date - 90)
  )
  select
    s.id, s.legacy_id, s.species, s.breed, s.sex, s.age, s.color,
    s.happened_at, s.region, s.address, s.place, s.description, s.image
  from scoped s
  where coalesce(array_length(p_provinces, 1), 0) > 0
    and nullif(btrim(coalesce(p_prefix, '')), '') is not null
    and split_part(s.source, ' ', 1) like any (array(select variant || '%' from unnest(p_provinces) as variant))
    -- 공백을 붙여 비교하므로 "중구"가 "중구로"에 걸리지 않습니다.
    and (substr(s.source, strpos(s.source, ' ') + 1) || ' ') like (btrim(p_prefix) || ' %')
  order by
    -- 골든타임 안의 우리 동 건만 최상단으로 올립니다.
    (
      nullif(btrim(coalesce(p_dong, '')), '') is not null
      and (substr(s.source, strpos(s.source, ' ') + 1) || ' ') like (btrim(p_dong) || ' %')
      and s.happened_on is not null
      and s.happened_on >= current_date - 7
    ) desc,
    s.happened_on desc nulls last,
    s.id
  limit least(greatest(coalesce(p_limit, 8), 1), 20);
$$;

grant execute on function public.search_public_lost_animals_nearby(text[], text, text, integer)
  to anon, authenticated, service_role;
