-- Real SQL integration checks; run in a disposable database after migrations.
begin;
insert into members(id,email,display_name,role,verified) values
 ('vol-admin','admin@example.test','운영자','admin',true),
 ('vol-one','one@example.test','신청자 1','member',false),
 ('vol-two','two@example.test','신청자 2','member',false);
do $$
declare shelter bigint; post bigint; first_application bigint; second_application bigint; old jsonb; fresh jsonb;
begin
 insert into shelter_profiles(public_id,name,region,introduction) values('vol-test','검증 보호소','서울','검증 소개') returning id into shelter;
 insert into volunteer_posts(shelter_id,title,description,region,scheduled_at,capacity) values(shelter,'봉사 모집','검증 모집','서울','2099-01-01',1) returning id into post;
 insert into volunteer_applications(post_id,member_id) values(post,'vol-one') returning id into first_application;
 insert into volunteer_applications(post_id,member_id) values(post,'vol-two') returning id into second_application;
 select to_jsonb(a) into old from volunteer_applications a where id=first_application;
 fresh:=manage_operation('vol-admin','volunteerApplications',first_application::text,'status','{"status":"accepted"}',old,'승인 검증');
 assert fresh->>'status'='accepted';
 assert exists(select 1 from notifications where member_id='vol-one' and type='volunteer_status');
 select to_jsonb(a) into old from volunteer_applications a where id=second_application;
 begin
  perform manage_operation('vol-admin','volunteerApplications',second_application::text,'status','{"status":"accepted"}',old,'정원 검증');
  raise exception 'capacity check was bypassed' using errcode='XX000';
 exception when raise_exception then null; end;
 assert (select status='submitted' from volunteer_applications where id=second_application);
 assert not exists(select 1 from notifications where member_id='vol-two');
 fresh:=manage_operation('vol-admin','volunteerApplications',first_application::text,'status','{"status":"completed"}',fresh,'완료 검증');
 assert fresh->>'status'='completed';
 assert (select count(*)=1 from volunteer_badges where member_id='vol-one');
 begin
  perform manage_operation('vol-admin','volunteerApplications',first_application::text,'status','{"status":"accepted"}',fresh,'종료 후 변경');
  raise exception 'terminal state changed' using errcode='XX000';
 exception when raise_exception then null; end;
 assert (select count(*)=1 from volunteer_badges where member_id='vol-one');
 assert (select count(*)=2 from admin_audit_logs where target_type='volunteerApplications' and target_id=first_application::text);
end $$;
rollback;
