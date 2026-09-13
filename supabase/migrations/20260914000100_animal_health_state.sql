-- 건강 필터: 공공 API 동기화 때 보호소 특징 메모(specialMark → summary)를 분류한 결과를 저장합니다.
--   ok   = 양호·미확인 (치료·관리 근거가 없음. 건강하다는 뜻은 아님)
--   care = 치료·관리 (현재 질환·증상·부상, 사고 의심, 진행 중 치료·회복)
-- 분류 규칙은 lib/animal-health.ts에 있고, 값은 동기화와 백필 스크립트가 채웁니다.
alter table public.public_animals add column if not exists health_state text not null default 'ok';
alter table public.public_animals drop constraint if exists public_animals_health_state_check;
alter table public.public_animals add constraint public_animals_health_state_check check (health_state in ('ok','care'));
create index if not exists idx_public_animals_health_state on public.public_animals(health_state) where active;

-- select * 뷰는 만들 때의 컬럼으로 고정되므로 다시 만들어 새 컬럼을 포함합니다(뒤에 컬럼이 추가되는 변경만 허용됨).
create or replace view public.visible_public_animals with (security_invoker=true) as
select * from public.public_animals where not hidden;
grant select on public.visible_public_animals to anon,authenticated,service_role;

-- 검색 RPC에 p_health(ok|care, 기본 null=전체)를 더합니다. 23개 인자 정의는 지웁니다(둘 다 남으면 PostgREST가 후보를 못 고름).
do $$
declare filtered_def text; storage_def text; original text; base_types text;
begin
  base_types := 'integer,timestamp with time zone,text,double precision,double precision,double precision,text,text,text,text,text[],text,text,text,boolean,boolean,double precision,text,double precision,double precision,double precision,double precision,boolean';
  select pg_get_functiondef(to_regprocedure('public.search_public_animals_filtered(' || base_types || ')')) into filtered_def;
  if filtered_def is null or position('where a.active = true' in filtered_def)=0 then raise exception 'Expected 23-argument filtered search definition'; end if;
  select pg_get_functiondef(to_regprocedure('public.search_public_animals_filtered_with_storage(' || base_types || ')')) into storage_def;
  if storage_def is null then raise exception 'Expected 23-argument storage search definition'; end if;

  original:=filtered_def;
  filtered_def:=replace(filtered_def,'p_thumbnail_only boolean DEFAULT false)','p_thumbnail_only boolean DEFAULT false, p_health text DEFAULT NULL::text)');
  if filtered_def=original then raise exception 'Filtered signature not extended'; end if;
  original:=filtered_def;
  filtered_def:=replace(filtered_def,'where a.active = true', $filters$where a.active = true
    and (p_health is null or a.health_state = p_health)$filters$);
  if filtered_def=original then raise exception 'Health filter not added'; end if;

  original:=storage_def;
  storage_def:=replace(storage_def,'p_thumbnail_only boolean DEFAULT false)','p_thumbnail_only boolean DEFAULT false, p_health text DEFAULT NULL::text)');
  if storage_def=original then raise exception 'Storage signature not extended'; end if;
  original:=storage_def;
  storage_def:=replace(storage_def,'p_weight_max, p_thumbnail_only','p_weight_max, p_thumbnail_only, p_health');
  if storage_def=original then raise exception 'Health argument not forwarded'; end if;

  execute 'drop function public.search_public_animals_filtered_with_storage(' || base_types || ')';
  execute 'drop function public.search_public_animals_filtered(' || base_types || ')';
  execute filtered_def;
  execute storage_def;
  if to_regprocedure('public.search_public_animals_filtered_with_storage(' || base_types || ',text)') is null then
    raise exception 'Expected 24-argument storage search was not created';
  end if;
end $$;
