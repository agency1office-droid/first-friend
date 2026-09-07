-- Share the post lock with manage_operation so owner and admin approvals cannot
-- exceed capacity, even when requests arrive at the same time.
create or replace function public.guardian_volunteer_status(p_actor text,p_id bigint,p_status text)
returns jsonb language plpgsql security definer set search_path=public as $$
declare a volunteer_applications; v volunteer_posts; fresh jsonb;
begin
  if not exists(select 1 from members where id=p_actor and not sanctioned and (role='admin' or (role='shelter' and verified))) then
    raise exception '인증된 보호소 담당자만 처리할 수 있어요.' using errcode='42501';
  end if;
  select * into a from volunteer_applications where id=p_id for update;
  if not found then raise exception '봉사 신청을 찾지 못했어요.' using errcode='P0002'; end if;
  select * into v from volunteer_posts where id=a.post_id for update;
  if not exists(select 1 from shelter_profiles where id=v.shelter_id and owner_id=p_actor and verified) then
    raise exception '담당 보호소 신청만 처리할 수 있어요.' using errcode='42501';
  end if;
  if not ((a.status='submitted' and p_status in ('accepted','declined')) or (a.status='accepted' and p_status in ('completed','declined'))) then
    raise exception '봉사 신청 진행 상태를 확인해 주세요.';
  end if;
  if p_status='accepted' and (v.status<>'open' or v.capacity<=(select count(*) from volunteer_applications where post_id=v.id and status in ('accepted','completed'))) then
    raise exception '모집 인원 또는 공고 상태를 확인해 주세요.';
  end if;
  update volunteer_applications set status=p_status where id=p_id;
  insert into notifications(member_id,type,title,body,href) values(a.member_id,'volunteer_status','봉사 신청 상태가 바뀌었어요',p_status,'/volunteer');
  if p_status='completed' then
    insert into volunteer_badges(member_id,kind,label) values(a.member_id,'first','첫 봉사'),
      (a.member_id,case when v.category='event' then 'care' else v.category end,
       case v.category when 'cleaning' then '깨끗한 하루' when 'photography' then '프로필 사진가' when 'transport' then '안전 이동' when 'medical' then '의료 도움' when 'event' then '현장 지원' else '돌봄 메이트' end)
      on conflict(member_id,kind) do nothing;
  end if;
  select to_jsonb(r) into fresh from volunteer_applications r where id=p_id;
  insert into admin_audit_logs(actor_id,action,target_type,target_id,before_json,after_json)
    values(p_actor,'guardian:volunteer-status','volunteerApplications',p_id::text,to_jsonb(a)::text,fresh::text);
  return fresh;
end $$;
revoke all on function public.guardian_volunteer_status(text,bigint,text) from public,anon,authenticated;
grant execute on function public.guardian_volunteer_status(text,bigint,text) to service_role;
