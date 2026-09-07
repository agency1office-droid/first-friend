-- Disposable database only. All fixtures and writes roll back.
begin;
insert into members(id,email,display_name,role) values ('review-admin','admin@example.test','관리자','admin'),('review-member','member@example.test','회원','member');
do $$
declare rid bigint; vid bigint; aid bigint; sid bigint; other_sid bigint; cid bigint; fid bigint; shelter bigint; result jsonb;
begin
  insert into direct_animals(member_id,name,species,region,rescue_story,health_json,life_json,adoption_terms)
    values('review-member','동물','강아지','서울','구조 이야기','{}','{}','입양 조건') returning id into rid;
  begin
    perform review_operation('review-member','registration-status',rid,'published','review','승인 테스트');
    assert false,'ordinary member could review';
  exception when insufficient_privilege then null; end;
  update members set sanctioned=true where id='review-admin';
  begin
    perform review_operation('review-admin','registration-status',rid,'published','review','승인 테스트');
    assert false,'sanctioned operator could review';
  exception when insufficient_privilege then null; end;
  update members set sanctioned=false where id='review-admin';
  result:=review_operation('review-admin','registration-status',rid,'published','review','승인 테스트');
  assert result->>'status'='published';
  begin
    perform review_operation('review-admin','registration-status',rid,'published','review','중복 승인');
    assert false,'stale review allowed';
  exception when serialization_failure then null; end;
  alter table admin_audit_logs add constraint review_audit_failure check(action<>'operation:registration-status') not valid;
  begin
    perform review_operation('review-admin','registration-status',rid,'closed','published','감사 실패');
    assert false,'audit failure ignored';
  exception when check_violation then null; end;
  assert (select status='published' from direct_animals where id=rid),'state must roll back with audit';
  alter table admin_audit_logs drop constraint review_audit_failure;
  insert into verification_requests(member_id,requested_role,evidence_key) values('review-admin','shelter','private-evidence/admin/proof') returning id into vid;
  begin
    perform review_operation('review-admin','verification-status',vid,'verified','submitted','과거 인증');
    assert false,'administrator demoted';
  exception when insufficient_privilege then null; end;
  assert (select role='admin' from members where id='review-admin');
  assert (select status='submitted' from verification_requests where id=vid);
  insert into verification_requests(member_id,requested_role,evidence_key) values('review-member','foster','private-evidence/member/proof') returning id into vid;
  alter table admin_audit_logs add constraint review_audit_failure check(action<>'operation:verification-status') not valid;
  begin
    perform review_operation('review-admin','verification-status',vid,'verified','submitted','감사 실패');
    assert false,'role audit failure ignored';
  exception when check_violation then null; end;
  assert (select role='member' from members where id='review-member');
  assert (select status='submitted' from verification_requests where id=vid);
  alter table admin_audit_logs drop constraint review_audit_failure;
  perform review_operation('review-admin','verification-status',vid,'verified','submitted','인증 승인');
  assert (select role='foster' and verified from members where id='review-member');
  insert into adoption_certifications(member_id,source,evidence_key) values('review-member','external','private-evidence/member/adoption') returning id into cid;
  perform review_operation('review-admin','adoption-certification-status',cid,'verified','submitted','입양 확인');
  assert (select count(*)=1 from notifications where member_id='review-member' and type='adoption_certification');
  insert into account_sanctions(member_id,actor_id,reason,status) values('review-member','review-admin','제재 하나','appealed') returning id into sid;
  insert into account_sanctions(member_id,actor_id,reason,status) values('review-member','review-admin','제재 둘','confirmed') returning id into other_sid;
  update members set sanctioned=true where id='review-member';
  insert into sanction_appeals(member_id,sanction_id,reason) values('review-member',sid,'이의제기') returning id into aid;
  perform review_operation('review-admin','appeal-status',aid,'accepted','submitted','이의 수용');
  assert (select status='lifted' from account_sanctions where id=sid);
  assert (select sanctioned from members where id='review-member'),'other active sanction must remain';
  insert into sanction_appeals(member_id,sanction_id,reason) values('review-member',other_sid,'두 번째 이의') returning id into aid;
  perform review_operation('review-admin','appeal-status',aid,'accepted','submitted','이의 수용');
  assert (select not sanctioned from members where id='review-member');
  insert into shelter_profiles(public_id,name,region,introduction) values('review-shelter','보호소','서울','소개') returning id into shelter;
  insert into fundraisers(shelter_id,animal_id,title,purpose,target_amount) values(shelter,'animal','모금','목적',100) returning id into fid;
  begin
    perform review_operation('review-admin','fundraiser-status',fid,'settled','review','순서 오류');
    assert false,'unapproved fundraiser completed';
  exception when raise_exception then null; end;
  perform review_operation('review-admin','fundraiser-status',fid,'open','review','모금 승인');
  perform review_operation('review-admin','fundraiser-status',fid,'settled','open','모금 종료');
  assert (select status='settled' from fundraisers where id=fid);
  assert not has_function_privilege('authenticated','public.review_operation(text,text,bigint,text,text,text)','execute');
  assert has_function_privilege('service_role','public.review_operation(text,text,bigint,text,text,text)','execute');
end $$;
rollback;
