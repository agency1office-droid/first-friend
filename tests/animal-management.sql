-- Isolated database only; all mutations roll back.
begin;
insert into members(id,email,display_name,role) values('animal-admin','animal-admin@example.test','관리자','admin'),('animal-member','animal-member@example.test','회원','member');
insert into public_animals(id,name,species,breed,age,age_group,sex,region,shelter_name,updated,image_1,summary,match_reason,last_seen_sync,synced_at)
values('animal-test','동물','강아지','믹스','2025','어른','수컷','서울','보호소','2026-09-07','https://example.test/photo.jpg','특징','참고','sync','2026-09-07');
do $$ declare old jsonb; fresh jsonb; begin
select to_jsonb(a) into old from public_animals a where id='animal-test';
begin
perform manage_animal('animal-member','publicAnimals','animal-test','visibility','{"hidden":true}',old,'신고 확인');
raise exception 'member access allowed';
exception when insufficient_privilege then null; end;
fresh:=manage_animal('animal-admin','publicAnimals','animal-test','visibility','{"hidden":true}',old,'신고 확인');
assert not exists(select 1 from visible_public_animals where id='animal-test');
assert exists(select 1 from admin_audit_logs where target_id='animal-test');
assert (fresh->>'active')::boolean;
-- A later source sync updates source fields, never the moderation flag.
update public_animals set summary='수집 갱신' where id='animal-test';
assert (select hidden from public_animals where id='animal-test');
begin
perform manage_animal('animal-admin','publicAnimals','animal-test','visibility','{"hidden":false}',old,'오래된 화면');
raise exception 'stale change allowed';
exception when serialization_failure then null; end;
select to_jsonb(a) into old from public_animals a where id='animal-test';
perform manage_animal('animal-admin','publicAnimals','animal-test','visibility','{"hidden":false}',old,'검토 후 복구');
assert exists(select 1 from visible_public_animals where id='animal-test');
end $$;
insert into direct_animals(id,member_id,name,species,region,rescue_story,health_json,life_json,adoption_terms)
values(999991,'animal-member','직접 동물','강아지','서울',repeat('구조 확인 ',8),'{}','{}',repeat('입양 조건 ',8));
do $$ declare old jsonb; fresh jsonb; begin
select to_jsonb(a) into old from direct_animals a where id=999991;
fresh:=manage_animal('animal-admin','registrations','999991','edit',jsonb_build_object('name','수정 이름','species','강아지','region','경기','rescue_story',repeat('구조 확인 ',8),'adoption_terms',repeat('입양 조건 ',8)),old,'보호처 요청');
assert fresh->>'name'='수정 이름';
assert fresh->>'status'='review';
assert fresh->>'member_id'='animal-member';
end $$;
rollback;
