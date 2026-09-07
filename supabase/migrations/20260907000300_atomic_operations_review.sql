-- State, member role/sanction changes, notifications and audit commit together.
create or replace function public.review_operation(p_actor text,p_action text,p_id bigint,p_status text,p_expected text,p_note text)
returns jsonb language plpgsql security definer set search_path=public as $$
declare t text; old jsonb; fresh jsonb; target members; allowed boolean := false;
begin
  perform 1 from members where id=p_actor and role='admin' and not sanctioned for update;
  if not found then raise exception '운영 권한이 필요해요.' using errcode='42501'; end if;
  if coalesce(length(trim(p_note)),0) not between 2 and 500 then raise exception '처리 사유를 확인해 주세요.'; end if;
  t:=case p_action when 'registration-status' then 'direct_animals' when 'verification-status' then 'verification_requests' when 'adoption-certification-status' then 'adoption_certifications' when 'appeal-status' then 'sanction_appeals' when 'fundraiser-status' then 'fundraisers' end;
  if t is null then raise exception '지원하지 않는 심사예요.'; end if;
  execute format('select to_jsonb(r) from %I r where id=$1 for update',t) into old using p_id;
  if old is null then raise exception '심사 항목을 찾지 못했어요.' using errcode='P0002'; end if;
  if p_expected is null or old->>'status' is distinct from p_expected or p_status is not distinct from p_expected then raise exception '상태가 바뀌었어요. 목록을 새로 불러와 주세요.' using errcode='40001'; end if;
  allowed:=case p_action
    when 'registration-status' then (p_expected='review' and p_status in ('published','closed')) or (p_expected='published' and p_status='closed')
    when 'verification-status' then p_expected='submitted' and p_status in ('verified','rejected')
    when 'adoption-certification-status' then p_expected='submitted' and p_status in ('verified','rejected')
    when 'appeal-status' then p_expected='submitted' and p_status in ('accepted','rejected')
    when 'fundraiser-status' then (p_expected='review' and p_status in ('open','rejected')) or (p_expected='open' and p_status='settled')
    else false end;
  if not coalesce(allowed,false) then raise exception '진행 상태를 확인해 주세요.'; end if;
  if p_action='verification-status' then
    if coalesce(old->>'evidence_key','')='' or coalesce(old->>'requested_role','') not in ('foster','shelter','veterinarian') then raise exception '인증 요청과 증빙을 확인해 주세요.'; end if;
    select * into target from members where id=old->>'member_id' for update;
    if target.id is null then raise exception '회원을 찾지 못했어요.' using errcode='P0002'; end if;
    if p_status='verified' then
      if target.role='admin' then raise exception '관리자 역할은 이 심사에서 변경하지 않아요.' using errcode='42501'; end if;
      update members set role=old->>'requested_role',verified=true where id=target.id;
    end if;
  elsif p_action='appeal-status' then
    select * into target from members where id=old->>'member_id' for update;
    perform 1 from account_sanctions where id=(old->>'sanction_id')::bigint and member_id=target.id for update;
    if not found then raise exception '제재 기록을 확인해 주세요.'; end if;
    update account_sanctions set status=case when p_status='accepted' then 'lifted' else 'confirmed' end where id=(old->>'sanction_id')::bigint;
    if p_status='accepted' then
      update members set sanctioned=exists(select 1 from account_sanctions where member_id=target.id and status in ('confirmed','appealed')) where id=target.id;
    end if;
  end if;
  if p_action in ('verification-status','adoption-certification-status','appeal-status') then
    execute format('update %I set status=$1,reviewed_by=$2 where id=$3',t) using p_status,p_actor,p_id;
  elsif p_action='registration-status' then
    update direct_animals set status=p_status,updated_at=clock_timestamp()::text where id=p_id;
  else update fundraisers set status=p_status where id=p_id;
  end if;
  if p_action='adoption-certification-status' then
    insert into notifications(member_id,type,title,body,href) values(old->>'member_id','adoption_certification','입양 인증 검토 결과',case when p_status='verified' then '입양 인증이 완료되어 입양 일기를 작성할 수 있어요.' else '입양 인증 자료를 다시 확인해 주세요.' end,'/adoption-verification');
  end if;
  execute format('select to_jsonb(r) from %I r where id=$1',t) into fresh using p_id;
  insert into admin_audit_logs(actor_id,action,target_type,target_id,before_json,after_json)
    values(p_actor,'operation:'||p_action,t,p_id::text,old::text,jsonb_build_object('status',p_status,'note',p_note,'record',fresh)::text);
  return fresh;
end $$;
revoke all on function public.review_operation(text,text,bigint,text,text,text) from public,anon,authenticated;
grant execute on function public.review_operation(text,text,bigint,text,text,text) to service_role;
