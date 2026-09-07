-- Run after migrations against a disposable database. Always rolled back.
begin;
insert into members(id,email,display_name,role,verified) values ('ops-test-admin','admin@example.test','관리자','admin',true),('ops-test-member','member@example.test','회원','member',false),('ops-test-other','other@example.test','미동의','member',false);
insert into auth_sessions(member_id,token_hash,expires_at) values('ops-test-member','test-only', '2099-01-01');
do $$
declare previous jsonb; fresh jsonb; cid bigint; post_id bigint; n integer;
begin
  select to_jsonb(m) into previous from members m where id='ops-test-member';
  begin
    perform manage_operation('ops-test-member','members','ops-test-member','suspend','{}',previous,'테스트');
    raise exception 'ordinary member was allowed';
  exception when insufficient_privilege then null; end;
  fresh:=manage_operation('ops-test-admin','members','ops-test-member','suspend','{}',previous,'제재 테스트');
  assert (fresh->>'sanctioned')::boolean;
  assert not exists(select 1 from auth_sessions where member_id='ops-test-member');
  assert exists(select 1 from admin_audit_logs where target_id='ops-test-member');
  begin
    perform manage_operation('ops-test-admin','members','ops-test-member','restore','{}',previous,'오래된 화면');
    raise exception 'stale update was allowed';
  exception when serialization_failure then null; end;
  fresh:=manage_operation('ops-test-admin','members','ops-test-member','restore','{}',fresh,'해제 테스트');
  assert not (fresh->>'sanctioned')::boolean;
  assert not exists(select 1 from account_sanctions where member_id='ops-test-member' and status='confirmed');
  select to_jsonb(m) into previous from members m where id='ops-test-admin';
  begin
    perform manage_operation('ops-test-admin','members','ops-test-admin','suspend','{}',previous,'셀프 제재');
    raise exception 'admin suspension was allowed';
  exception when insufficient_privilege then null; end;
  insert into posts(member_id,category,title,body) values('ops-test-member','daily','테스트 게시글','보존할 본문') returning id into post_id;
  select to_jsonb(p) into previous from posts p where id=post_id;
  fresh:=manage_operation('ops-test-admin','posts',post_id::text,'visibility','{"hidden":true}',previous,'숨김 테스트');
  assert (fresh->>'hidden')::boolean;
  assert fresh->>'body'='보존할 본문';
  -- Audit failure must roll back the write.
  alter table admin_audit_logs add constraint test_no_audit check(action<>'visibility') not valid;
  begin
    perform manage_operation('ops-test-admin','posts',post_id::text,'visibility','{"hidden":false}',fresh,'감사 실패');
    raise exception 'audit failure ignored';
  exception when check_violation then null; end;
  assert (select hidden from posts where id=post_id);
  alter table admin_audit_logs drop constraint test_no_audit;
  perform set_contact_preferences('ops-test-member',false,true,'test');
  fresh:=create_outreach('ops-test-admin','테스트 캠페인','테스트 본문','notification','all','/mypage','생성 테스트');cid:=(fresh->>'id')::bigint;
  perform manage_operation('ops-test-admin','campaigns',cid::text,'queue','{}',fresh,'준비 테스트');
  select count(*) into n from outreach_deliveries where campaign_id=cid;assert n=1;
  perform claim_outreach('ops-test-admin',cid);perform claim_outreach('ops-test-admin',cid);perform claim_outreach('ops-test-admin',cid);
  select count(*) into n from notifications where member_id='ops-test-member' and type='marketing';assert n=1;
  fresh:=create_outreach('ops-test-admin','철회 테스트','테스트 본문','notification','all','/mypage','생성 테스트');cid:=(fresh->>'id')::bigint;
  perform manage_operation('ops-test-admin','campaigns',cid::text,'queue','{}',fresh,'준비 테스트');
  perform set_contact_preferences('ops-test-member',false,false,'test-withdraw');
  perform claim_outreach('ops-test-admin',cid);
  assert (select status='skipped' from outreach_deliveries where campaign_id=cid);
  perform set_contact_preferences('ops-test-member',true,false,'test');
  fresh:=create_outreach('ops-test-admin','이메일 검증','테스트 본문','email','all','/mypage','생성 테스트');cid:=(fresh->>'id')::bigint;
  perform manage_operation('ops-test-admin','campaigns',cid::text,'queue','{}',fresh,'준비 테스트');
  assert not exists(select 1 from outreach_deliveries where campaign_id=cid);
  insert into support_tickets(member_id,title,body) values('ops-test-member','고객 문의','고객 문의 본문') returning id into post_id;
  select to_jsonb(t) into previous from support_tickets t where id=post_id;
  fresh:=manage_operation('ops-test-admin','tickets',post_id::text,'reply','{"reply":"안내 답변입니다."}',previous,'답변 테스트');
  assert fresh->>'status'='answered';
  assert exists(select 1 from notifications where member_id='ops-test-member' and type='support_reply');
end $$;
rollback;
