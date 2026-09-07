begin;
insert into members(id,email,display_name,role,verified) values('guardian-test','g@example.test','담당자','shelter',true),('outsider-test','o@example.test','다른 담당자','shelter',true),('applicant-test','a@example.test','신청자','member',false),('applicant-two','b@example.test','신청자2','member',false);
do $$
declare sid bigint; pid bigint; aid bigint; bid bigint;
begin
 insert into shelter_profiles(owner_id,public_id,name,region,introduction,verified) values('guardian-test','guardian-test','보호소','서울','소개',true) returning id into sid;
 insert into volunteer_posts(shelter_id,title,description,region,scheduled_at,capacity) values(sid,'봉사','내용','서울','2099-01-01',1) returning id into pid;
 insert into volunteer_applications(post_id,member_id) values(pid,'applicant-test') returning id into aid;
 insert into volunteer_applications(post_id,member_id) values(pid,'applicant-two') returning id into bid;
 begin
  perform guardian_volunteer_status('outsider-test',aid,'accepted');
  assert false,'foreign shelter approved';
 exception when insufficient_privilege then null; end;
 perform guardian_volunteer_status('guardian-test',aid,'accepted');
 begin
  perform guardian_volunteer_status('guardian-test',bid,'accepted');
  assert false,'capacity exceeded';
 exception when raise_exception then null; end;
 alter table admin_audit_logs add constraint security_volunteer_audit check(action<>'guardian:volunteer-status') not valid;
 begin
  perform guardian_volunteer_status('guardian-test',aid,'completed');
  assert false,'audit failure ignored';
 exception when check_violation then null; end;
 assert (select status='accepted' from volunteer_applications where id=aid);
 assert not exists(select 1 from volunteer_badges where member_id='applicant-test');
 alter table admin_audit_logs drop constraint security_volunteer_audit;
 perform guardian_volunteer_status('guardian-test',aid,'completed');
 assert exists(select 1 from volunteer_badges where member_id='applicant-test');
 begin
  perform guardian_volunteer_status('guardian-test',aid,'accepted');
  assert false,'completed reopened';
 exception when raise_exception then null; end;
end $$;
rollback;
