begin;
do $$ begin
  if to_regprocedure('public.search_public_animals_filtered(integer,timestamp with time zone,text,double precision,double precision,double precision,text,text,text,text,text[],text,text,text,boolean,boolean,double precision,text,double precision,double precision,double precision,double precision)') is null then raise exception 'missing exact 22-argument search'; end if;
  if public.animal_weight_kg('["1~3(Kg)"]') <> 2 then raise exception 'range weight'; end if;
  if public.animal_weight_kg('["350kg"]') is not null then raise exception 'invalid weight'; end if;
  if public.animal_weight_kg('invalid json') is not null then raise exception 'invalid traits'; end if;
  if public.animal_size_group('강아지','토이 푸들','["10kg"]') <> 'small' then raise exception 'breed hint priority'; end if;
  if public.animal_size_group('고양이','믹스','["4(Kg)"]') <> 'medium' then raise exception 'species threshold'; end if;
  if public.animal_age_years('6개월') <> 0.5 then raise exception 'months'; end if;
  if public.animal_age_years('미상') is not null then raise exception 'unknown age'; end if;
end $$;
-- Fixtures are rolled back. Run in an isolated database initialized with the
-- search schema/migrations; they exercise SQL filters before count/cursor/limit.
insert into public_animals(id,name,species,breed,age,age_group,traits_json,health_json,size_group,active,hidden,updated_at,image_1_storage)
values
('search-a','a','강아지','말티즈','2살','청년 친구','["2kg"]','["중성화 완료로 등록됨"]','small',true,false,'2026-09-01','thumb-a'),
('search-b','b','강아지','말티즈','3살','청년 친구','["3kg"]','["중성화 완료로 등록됨"]','small',true,false,'2026-09-01','thumb-b'),
('search-c','c','강아지','말티즈','12살','나이 많은 친구','["4kg"]','["중성화되지 않은 것으로 등록됨"]','small',true,false,'2026-09-01','thumb-c'),
('search-hidden','h','강아지','말티즈','2살','청년 친구','["2kg"]','["중성화 완료로 등록됨"]','small',true,true,'2026-09-01','thumb-hidden');
do $$ declare r record; n integer; begin
  select * into r from search_public_animals_filtered_with_storage(p_limit=>1,p_neutered=>'yes',p_age_max=>5,p_weight_max=>3,p_size_group=>'small');
  if r.id <> 'search-a' or r.total_count <> 2 or r.image_1_storage <> 'thumb-a' then raise exception 'filtered count/storage/visibility'; end if;
  select * into r from search_public_animals_filtered_with_storage(p_limit=>1,p_neutered=>'yes',p_age_max=>5,p_weight_max=>3,p_size_group=>'small',p_cursor_updated_at=>'2026-09-01',p_cursor_id=>'search-a');
  if r.id <> 'search-b' then raise exception 'equal timestamp cursor skips or duplicates'; end if;
  select count(*) into n from search_public_animals_filtered_with_storage(p_neutered=>'yes',p_age_max=>5,p_weight_max=>3,p_size_group=>'small',p_cursor_updated_at=>'2026-09-01',p_cursor_id=>'search-b');
  if n <> 0 then raise exception 'end cursor'; end if;
  select count(*) into n from search_public_animals_filtered_with_storage(p_kind_codes=>array['999999']);
  if n <> 0 then raise exception 'empty filter'; end if;
end $$;
rollback;
