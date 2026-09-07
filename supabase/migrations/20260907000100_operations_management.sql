-- Additive operations tools. All writes and audit entries below commit together.
alter table public.community_questions add column if not exists hidden boolean not null default false;
alter table public.community_answers add column if not exists hidden boolean not null default false;
alter table public.drawing_posts add column if not exists hidden boolean not null default false;
alter table public.reports add column if not exists status text not null default 'open';

create table public.contact_preferences (
  member_id text primary key references public.members(id),
  marketing_email boolean not null default false,
  marketing_notification boolean not null default false,
  unsubscribe_token uuid not null default gen_random_uuid() unique,
  updated_at timestamptz not null default now()
);
create table public.contact_consent_events (
  id bigint generated always as identity primary key,
  member_id text not null references public.members(id),
  marketing_email boolean not null, marketing_notification boolean not null,
  source text not null, created_at timestamptz not null default now()
);
create table public.support_tickets (
  id bigint generated always as identity primary key,
  member_id text not null references public.members(id), title text not null, body text not null,
  reply text not null default '', status text not null default 'open' check(status in ('open','answered','closed')),
  created_at timestamptz not null default now()
);
create table public.outreach_campaigns (
  id bigint generated always as identity primary key,
  title text not null, body text not null,
  channel text not null check(channel in ('email','notification')),
  audience text not null check(audience in ('all','member','shelter','foster','veterinarian')),
  href text not null default '/mypage',
  status text not null default 'draft' check(status in ('draft','queued','completed','cancelled')),
  created_by text not null references public.members(id), created_at timestamptz not null default now()
);
create table public.outreach_deliveries (
  id bigint generated always as identity primary key,
  campaign_id bigint not null references public.outreach_campaigns(id),
  member_id text not null references public.members(id), recipient text not null,
  status text not null default 'pending' check(status in ('pending','processing','accepted','failed','skipped')),
  provider_id text, error text, created_at timestamptz not null default now(),
  unique(campaign_id,member_id), unique(campaign_id,recipient)
);
create index on public.outreach_deliveries(campaign_id,status,id);
create index on public.support_tickets(status,created_at);
alter table public.contact_preferences enable row level security;
alter table public.contact_consent_events enable row level security;
alter table public.support_tickets enable row level security;
alter table public.outreach_campaigns enable row level security;
alter table public.outreach_deliveries enable row level security;
revoke all on public.contact_preferences, public.contact_consent_events, public.support_tickets, public.outreach_campaigns, public.outreach_deliveries from anon, authenticated;
grant all on public.contact_preferences, public.contact_consent_events, public.support_tickets, public.outreach_campaigns, public.outreach_deliveries to service_role;
grant usage,select on sequence public.contact_consent_events_id_seq,public.support_tickets_id_seq,public.outreach_campaigns_id_seq,public.outreach_deliveries_id_seq to service_role;

create or replace function public.create_outreach(p_actor text,p_title text,p_body text,p_channel text,p_audience text,p_href text,p_note text)
returns jsonb language plpgsql security definer set search_path=public as $$
declare r outreach_campaigns;
begin
  if not exists(select 1 from members where id=p_actor and role='admin' and not sanctioned) then raise exception '운영 권한이 필요해요.' using errcode='42501'; end if;
  if length(trim(p_title)) not between 2 and 120 or length(trim(p_body)) not between 2 and 5000 or length(trim(p_note)) not between 2 and 500 then raise exception '입력 내용을 확인해 주세요.'; end if;
  insert into outreach_campaigns(title,body,channel,audience,href,created_by) values(p_title,p_body,p_channel,p_audience,p_href,p_actor) returning * into r;
  insert into admin_audit_logs(actor_id,action,target_type,target_id,after_json) values(p_actor,'campaign:create','campaigns',r.id::text,jsonb_build_object('record',to_jsonb(r),'note',p_note)::text);
  return to_jsonb(r);
end $$;
revoke all on function public.create_outreach(text,text,text,text,text,text,text) from public,anon,authenticated;
grant execute on function public.create_outreach(text,text,text,text,text,text,text) to service_role;

create or replace function public.manage_operation(p_actor text, p_resource text, p_id text, p_action text, p_value jsonb, p_expected jsonb, p_note text)
returns jsonb language plpgsql security definer set search_path=public as $$
declare t text; old jsonb; fresh jsonb; allowed text[]; new_status text;
begin
  if not exists(select 1 from members where id=p_actor and role='admin' and not sanctioned) then raise exception '운영 권한이 필요해요.' using errcode='42501'; end if;
  if length(trim(p_note))<2 or length(p_note)>500 then raise exception '처리 사유를 확인해 주세요.'; end if;
  t := case p_resource when 'members' then 'members' when 'posts' then 'posts' when 'questions' then 'community_questions' when 'answers' then 'community_answers' when 'drawings' then 'drawing_posts' when 'updates' then 'shelter_updates' when 'shelters' then 'shelter_profiles' when 'volunteers' then 'volunteer_posts' when 'volunteerApplications' then 'volunteer_applications' when 'lost' then 'lost_reports' when 'support' then 'support_records' when 'tickets' then 'support_tickets' when 'reports' then 'reports' when 'campaigns' then 'outreach_campaigns' end;
  if t is null then raise exception '지원하지 않는 업무예요.'; end if;
  execute format('select to_jsonb(r) from %I r where id::text=$1 for update',t) into old using p_id;
  if old is null then raise exception '항목을 찾지 못했어요.' using errcode='P0002'; end if;
  if p_expected is null or p_expected->>'id' is distinct from p_id or not(old @> p_expected) then raise exception '다른 작업에서 변경됐어요. 새로 불러와 주세요.' using errcode='40001'; end if;
  if p_resource='members' then
    if old->>'role'='admin' or p_id=p_actor then raise exception '운영자 계정은 이 화면에서 변경하지 않아요.' using errcode='42501'; end if;
    if p_action='profile' then
      if length(trim(p_value->>'display_name')) not between 1 and 60 or length(p_value->>'home_region')>80 then raise exception '회원 이름과 지역을 확인해 주세요.'; end if;
      update members set display_name=trim(p_value->>'display_name'), home_region=p_value->>'home_region' where id=p_id;
    elsif p_action in ('suspend','restore') then
      update members set sanctioned=(p_action='suspend') where id=p_id;
      if p_action='suspend' then
        insert into account_sanctions(member_id,actor_id,reason,status) values(p_id,p_actor,p_note,'confirmed');
      else update account_sanctions set status='lifted' where member_id=p_id and status in ('proposed','confirmed'); end if;
      delete from auth_sessions where member_id=p_id;
    elsif p_action='sessions' then delete from auth_sessions where member_id=p_id;
    else raise exception '지원하지 않는 회원 작업이에요.'; end if;
  elsif p_action='visibility' and p_resource in ('posts','questions','answers','drawings','updates') then
    if jsonb_typeof(p_value->'hidden') is distinct from 'boolean' then raise exception '공개 상태를 확인해 주세요.'; end if;
    execute format('update %I set hidden=$1 where id::text=$2',t) using (p_value->>'hidden')::boolean,p_id;
  elsif p_action='edit' and p_resource in ('posts','questions','answers','drawings','updates') then
    if p_resource<>'answers' and length(trim(p_value->>'title')) not between 2 and 120 then raise exception '제목을 확인해 주세요.'; end if;
    if length(trim(p_value->>'body')) not between 2 and 5000 then raise exception '본문을 확인해 주세요.'; end if;
    if p_resource='answers' then update community_answers set body=p_value->>'body' where id::text=p_id;
    else execute format('update %I set title=$1,%I=$2 where id::text=$3',t,case when p_resource='drawings' then 'description' else 'body' end) using p_value->>'title',p_value->>'body',p_id; end if;
  elsif p_action='edit' and p_resource='shelters' then
    if length(trim(p_value->>'name')) not between 2 and 120 or length(p_value->>'introduction')>2000 or length(p_value->>'region')>80 then raise exception '보호소 정보를 확인해 주세요.'; end if;
    update shelter_profiles set name=p_value->>'name',introduction=p_value->>'introduction',region=p_value->>'region' where id::text=p_id;
  elsif p_action='reply' and p_resource='tickets' then
    if length(trim(p_value->>'reply')) not between 2 and 2000 then raise exception '답변을 확인해 주세요.'; end if;
    update support_tickets set reply=p_value->>'reply',status='answered' where id::text=p_id;
    insert into notifications(member_id,type,title,body,href) values(old->>'member_id','support_reply','문의에 답변이 도착했어요',left(p_value->>'reply',100),'/mypage/contact');
  elsif p_action='status' then
    new_status:=p_value->>'status';
    allowed:=case p_resource when 'reports' then array['open','resolved','closed'] when 'volunteers' then array['open','closed'] when 'volunteerApplications' then array['submitted','accepted','declined','completed'] when 'lost' then array['active','resolved','closed'] when 'support' then array['intent','contacted','closed'] when 'tickets' then array['open','closed'] else array[]::text[] end;
    if new_status is null or not(new_status=any(allowed)) then raise exception '상태를 확인해 주세요.'; end if;
    if p_resource='volunteerApplications' then
      if not ((old->>'status'='submitted' and new_status in ('accepted','declined')) or (old->>'status'='accepted' and new_status in ('completed','declined'))) then raise exception '봉사 신청 진행 상태를 확인해 주세요.'; end if;
      if new_status='accepted' then
        perform 1 from volunteer_posts where id=(old->>'post_id')::bigint for update;
        if not exists(select 1 from volunteer_posts v where v.id=(old->>'post_id')::bigint and v.status='open' and v.capacity>(select count(*) from volunteer_applications a where a.post_id=v.id and a.status in ('accepted','completed'))) then raise exception '모집 인원 또는 공고 상태를 확인해 주세요.'; end if;
      end if;
      insert into notifications(member_id,type,title,body,href) values(old->>'member_id','volunteer_status','봉사 신청 상태가 바뀌었어요',new_status,'/volunteer');
      if new_status='completed' then insert into volunteer_badges(member_id,kind,label) values(old->>'member_id','first','첫 봉사') on conflict(member_id,kind) do nothing; end if;
    end if;
    execute format('update %I set status=$1 where id::text=$2',t) using new_status,p_id;
  elsif p_resource='campaigns' and p_action='edit' then
    if old->>'status'<>'draft' then raise exception '작성 중인 초안만 수정할 수 있어요.'; end if;
    if length(trim(p_value->>'title')) not between 2 and 120 or length(trim(p_value->>'body')) not between 2 and 5000 then raise exception '제목과 본문을 확인해 주세요.'; end if;
    update outreach_campaigns set title=p_value->>'title',body=p_value->>'body',channel=p_value->>'channel',audience=p_value->>'audience',href=p_value->>'href' where id=p_id::bigint;
  elsif p_resource='campaigns' and p_action='queue' then
    if old->>'status'<>'draft' then raise exception '작성 중인 캠페인만 발송할 수 있어요.'; end if;
    insert into outreach_deliveries(campaign_id,member_id,recipient)
      select p_id::bigint,m.id,case when old->>'channel'='email' then m.email else m.id end
      from members m join contact_preferences p on p.member_id=m.id
      where not m.sanctioned and (old->>'audience'='all' or m.role=old->>'audience')
      and case when old->>'channel'='email' then p.marketing_email and exists(select 1 from auth_accounts a where a.member_id=m.id and a.email=m.email and a.email_verified) else p.marketing_notification end
      on conflict do nothing;
    update outreach_campaigns set status=case when exists(select 1 from outreach_deliveries where campaign_id=p_id::bigint) then 'queued' else 'completed' end where id=p_id::bigint;
  elsif p_resource='campaigns' and p_action='cancel' then
    if old->>'status' not in ('draft','queued') then raise exception '취소 가능한 캠페인이 아니에요.'; end if;
    update outreach_campaigns set status='cancelled' where id=p_id::bigint;
    update outreach_deliveries set status='skipped',error='운영자 취소' where campaign_id=p_id::bigint and status='pending';
  else raise exception '지원하지 않는 작업이에요.'; end if;
  execute format('select to_jsonb(r) from %I r where id::text=$1',t) into fresh using p_id;
  insert into admin_audit_logs(actor_id,action,target_type,target_id,before_json,after_json) values(p_actor,p_action,p_resource,p_id,old::text,jsonb_build_object('record',fresh,'note',p_note)::text);
  return fresh;
end $$;
revoke all on function public.manage_operation(text,text,text,text,jsonb,jsonb,text) from public,anon,authenticated;
grant execute on function public.manage_operation(text,text,text,text,jsonb,jsonb,text) to service_role;

create or replace function public.set_contact_preferences(p_member text,p_email boolean,p_notification boolean,p_source text)
returns void language plpgsql security definer set search_path=public as $$
begin
  insert into contact_preferences(member_id,marketing_email,marketing_notification) values(p_member,p_email,p_notification)
  on conflict(member_id) do update set marketing_email=excluded.marketing_email,marketing_notification=excluded.marketing_notification,updated_at=now();
  insert into contact_consent_events(member_id,marketing_email,marketing_notification,source) values(p_member,p_email,p_notification,p_source);
end $$;
revoke all on function public.set_contact_preferences(text,boolean,boolean,text) from public,anon,authenticated;
grant execute on function public.set_contact_preferences(text,boolean,boolean,text) to service_role;

-- Atomic in-app delivery; email is claimed before the external request and never blindly retried.
create or replace function public.claim_outreach(p_actor text,p_campaign bigint)
returns jsonb language plpgsql security definer set search_path=public as $$
declare c outreach_campaigns; d outreach_deliveries; pref contact_preferences; m members;
begin
  if not exists(select 1 from members where id=p_actor and role='admin' and not sanctioned) then raise exception '운영 권한이 필요해요.' using errcode='42501'; end if;
  select * into c from outreach_campaigns where id=p_campaign for update;
  if c.status is distinct from 'queued' then return null; end if;
  select * into d from outreach_deliveries where campaign_id=p_campaign and status='pending' order by id limit 1 for update skip locked;
  if d.id is null then
    if not exists(select 1 from outreach_deliveries where campaign_id=p_campaign and status='processing') then update outreach_campaigns set status='completed' where id=p_campaign; end if;
    return null;
  end if;
  select * into pref from contact_preferences where member_id=d.member_id;
  select * into m from members where id=d.member_id;
  if m.sanctioned or pref.member_id is null or (c.channel='email' and (not pref.marketing_email or m.email<>d.recipient or not exists(select 1 from auth_accounts where member_id=m.id and email=m.email and email_verified))) or (c.channel='notification' and not pref.marketing_notification) then
    update outreach_deliveries set status='skipped',error='수신 동의 또는 계정 상태 변경' where id=d.id;
    return jsonb_build_object('skip',true);
  end if;
  if c.channel='notification' then
    insert into notifications(member_id,type,title,body,href) values(d.member_id,'marketing','(광고) '||c.title,c.body,c.href);
    update outreach_deliveries set status='accepted' where id=d.id;
    return jsonb_build_object('skip',true);
  end if;
  update outreach_deliveries set status='processing' where id=d.id;
  return jsonb_build_object('delivery',to_jsonb(d),'campaign',to_jsonb(c),'unsubscribe',pref.unsubscribe_token);
end $$;
revoke all on function public.claim_outreach(text,bigint) from public,anon,authenticated;
grant execute on function public.claim_outreach(text,bigint) to service_role;
