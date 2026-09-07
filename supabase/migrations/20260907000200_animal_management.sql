alter table public.public_animals add column if not exists hidden boolean not null default false;
alter table public.public_animals add column if not exists notice_no text not null default '';

-- Keep operator visibility separate from source active/process_state and sync updates.
create or replace view public.visible_public_animals with (security_invoker=true) as
select * from public.public_animals where not hidden;
grant select on public.visible_public_animals to anon,authenticated,service_role;

-- Preserve the current search/cursor/filter definitions while excluding hidden rows
-- before their count, limit and offset. Sync/retention writes still use the base table.
do $$ declare f record; definition text; begin
  for f in select p.oid from pg_proc p join pg_namespace n on n.oid=p.pronamespace
    where n.nspname='public' and p.proname in ('search_public_animals','get_public_animal_filter_options','count_public_animal_breeds')
  loop
    definition:=pg_get_functiondef(f.oid);
    execute replace(definition,'public.public_animals','public.visible_public_animals');
  end loop;
end $$;

create or replace function public.manage_animal(p_actor text,p_resource text,p_id text,p_action text,p_value jsonb,p_expected jsonb,p_note text)
returns jsonb language plpgsql security definer set search_path=public as $$
declare old jsonb; fresh jsonb; t text;
begin
  if not exists(select 1 from members where id=p_actor and role='admin' and not sanctioned) then raise exception '운영 권한이 필요해요.' using errcode='42501'; end if;
  if coalesce(length(trim(p_note)),0) not between 2 and 500 then raise exception '처리 사유를 확인해 주세요.'; end if;
  t:=case p_resource when 'publicAnimals' then 'public_animals' when 'registrations' then 'direct_animals' end;
  if t is null then raise exception '지원하지 않는 업무예요.'; end if;
  execute format('select to_jsonb(r) from %I r where id::text=$1 for update',t) into old using p_id;
  if old is null then raise exception '동물을 찾지 못했어요.' using errcode='P0002'; end if;
  if p_expected is null or p_expected->>'id' is distinct from p_id or not(old @> p_expected) then raise exception '다른 작업에서 변경됐어요. 새로 불러와 주세요.' using errcode='40001'; end if;
  if p_resource='publicAnimals' and p_action='visibility' then
    if jsonb_typeof(p_value->'hidden') is distinct from 'boolean' then raise exception '공개 상태를 확인해 주세요.'; end if;
    update public_animals set hidden=(p_value->>'hidden')::boolean where id=p_id;
  elsif p_resource='registrations' and p_action='edit' then
    if coalesce(length(trim(p_value->>'name')),0) not between 1 and 60
      or coalesce(length(trim(p_value->>'species')),0) not between 1 and 20
      or coalesce(length(trim(p_value->>'region')),0) not between 1 and 80
      or coalesce(length(trim(p_value->>'rescue_story')),0) not between 30 and 5000
      or coalesce(length(trim(p_value->>'adoption_terms')),0) not between 20 and 5000 then raise exception '이름·종류·지역·구조 이야기·입양 조건을 확인해 주세요.'; end if;
    update direct_animals set name=trim(p_value->>'name'),species=trim(p_value->>'species'),region=trim(p_value->>'region'),rescue_story=trim(p_value->>'rescue_story'),adoption_terms=trim(p_value->>'adoption_terms'),updated_at=clock_timestamp()::text where id::text=p_id;
  else raise exception '지원하지 않는 동물 관리 기능이에요.'; end if;
  execute format('select to_jsonb(r) from %I r where id::text=$1',t) into fresh using p_id;
  insert into admin_audit_logs(actor_id,action,target_type,target_id,before_json,after_json)
    values(p_actor,p_action,p_resource,p_id,old::text,jsonb_build_object('record',fresh,'note',p_note)::text);
  return fresh;
end $$;
revoke all on function public.manage_animal(text,text,text,text,jsonb,jsonb,text) from public,anon,authenticated;
grant execute on function public.manage_animal(text,text,text,text,jsonb,jsonb,text) to service_role;
