-- Keep the old RPC during rolling deployment. The new RPC handles all filters
-- in SQL before pagination; no full-feed transfer to the application is needed.
create or replace function public.animal_weight_kg(traits text)
returns double precision language plpgsql immutable set search_path=public as $$
declare trait text; result double precision;
begin
  select value into trait from jsonb_array_elements_text(traits::jsonb) where value ~* 'kg' limit 1;
  select avg((m[1])::double precision) into result from regexp_matches(trait,'([0-9]+(?:\.[0-9]+)?)','g') m
    where (m[1])::double precision > 0 and (m[1])::double precision <= 150;
  return result;
exception when invalid_text_representation or invalid_parameter_value then return null;
end $$;

create or replace function public.animal_age_years(age text)
returns double precision language sql stable set search_path=public as $$
select case
  when age ~ '[0-9]{4}\s*\(년생\)' then greatest(0,extract(year from current_date)-substring(age from '([0-9]{4})\s*\(년생\)')::double precision)
  when age ~ '[0-9]+(?:\.[0-9]+)?\s*개월' then substring(age from '([0-9]+(?:\.[0-9]+)?)\s*개월')::double precision / 12
  when age ~ '[0-9]+(?:\.[0-9]+)?\s*일' then substring(age from '([0-9]+(?:\.[0-9]+)?)\s*일')::double precision / 365
  when age ~ '[0-9]+(?:\.[0-9]+)?\s*살' then substring(age from '([0-9]+(?:\.[0-9]+)?)\s*살')::double precision
  else null end;
$$;

-- Same ordered breed hints and thresholds as sync's sizeGroup().
create or replace function public.animal_size_group(species text, breed text, traits text)
returns text language sql immutable set search_path=public as $$
with normalized as (select lower(regexp_replace(coalesce(breed,''),'[[:space:]·()_-]','','g')) as breed, public.animal_weight_kg(traits) as weight)
select case
  when breed like any(array['%치와와%','%말티즈%','%포메라니안%','%요크셔%','%토이푸들%','%미니어쳐푸들%','%미니어쳐핀셔%','%빠삐용%','%파피용%','%이탈리안그레이하운드%','%페키니즈%','%시츄%','%싱가푸라%']) then 'small'
  when breed like any(array['%비숑%','%프렌치불독%','%보스턴테리어%','%시바%','%코카스파니엘%','%아메리칸코카%','%스탠다드닥스훈트%','%웰시코기%','%진도견%','%진돗개%','%샴%','%먼치킨%','%스코티시폴드%','%러시안블루%','%아메리칸쇼트헤어%','%브리티시쇼트헤어%','%페르시안%','%터키시앙고라%']) then 'medium'
  when breed like any(array['%보더콜리%','%푸들%','%스피츠%','%골든리트리버%','%라브라도%','%래브라도%','%셰퍼드%','%도베르만%','%포인터%','%사모예드%','%시베리안허스키%','%허스키%','%마리노이즈%','%콜리%','%플랫코티드리트리버%','%비즐라%','%샤페이%','%벵갈%']) then 'large'
  when breed like any(array['%말라뮤트%','%알래스칸맬러뮤트%','%도사%','%그레이트데인%','%마스티프%','%세인트버나드%','%뉴펀들랜드%','%로트와일러%','%버니즈%','%메인쿤%','%랙돌%','%노르웨이숲%','%사바나%']) then 'xlarge'
  when weight is null then 'unknown'
  when weight < case when species='고양이' then 3 else 5 end then 'small'
  when weight < case when species='고양이' then 6 else 15 end then 'medium'
  when weight < case when species='고양이' then 10 else 30 end then 'large'
  else 'xlarge' end from normalized;
$$;
update public.public_animals set size_group=public.animal_size_group(species,breed,traits_json)
where size_group is distinct from public.animal_size_group(species,breed,traits_json);

-- Preserve the existing color aliases, visibility predicate, PostGIS distance,
-- and count-on-first-page behavior rather than maintaining another SQL copy.
do $$
declare definition text; original text; signature text; base_types text; extended_types text;
begin
  base_types := 'integer,timestamp with time zone,text,double precision,double precision,double precision,text,text,text,text,text[],text,text,text,boolean,boolean,double precision';
  extended_types := base_types || ',text,double precision,double precision,double precision,double precision';
  signature := ', p_neutered text DEFAULT NULL, p_age_min double precision DEFAULT 0, p_age_max double precision DEFAULT 17, p_weight_min double precision DEFAULT 0, p_weight_max double precision DEFAULT 60)';
  -- Select the exact live 17-argument contract, never an arbitrary overload.
  select pg_get_functiondef(to_regprocedure('public.search_public_animals(' || base_types || ')')) into definition;
  if definition is null or position('public.visible_public_animals' in definition)=0 then raise exception 'Expected visible animal search definition'; end if;
  definition:=replace(definition,'FUNCTION public.search_public_animals(','FUNCTION public.search_public_animals_filtered(');
  original:=definition;
  definition:=regexp_replace(definition,'\)\s+RETURNS',signature||E'\n RETURNS');
  if definition=original then raise exception 'Search signature not extended'; end if;
  original:=definition;
  definition:=replace(definition,'where a.active = true', $filters$where a.active = true
    and (p_neutered is null or (position('yes' in p_neutered)>0 and a.health_json like '%중성화 완료로 등록됨%') or (position('no' in p_neutered)>0 and a.health_json like '%중성화되지 않은 것으로 등록됨%'))
    and ((p_age_min=0 and p_age_max>=17) or public.animal_age_years(a.age) is null or public.animal_age_years(a.age) between p_age_min and p_age_max)
    and ((p_weight_min=0 and p_weight_max>=60) or public.animal_weight_kg(a.traits_json) is null or public.animal_weight_kg(a.traits_json) between p_weight_min and p_weight_max)$filters$);
  if definition=original then raise exception 'Search filters not extended'; end if;
  -- The tie-breaker must agree with ORDER BY id ASC, including equal timestamps.
  definition:=replace(definition,'c.id < coalesce(p_cursor_id', 'c.id > coalesce(p_cursor_id');
  execute definition;
  if to_regprocedure('public.search_public_animals_filtered(' || extended_types || ')') is null then
    raise exception 'Expected 22-argument filtered search was not created';
  end if;
  select pg_get_functiondef(to_regprocedure('public.search_public_animals_with_storage(' || base_types || ')')) into definition;
  if definition is null then raise exception 'Expected storage search definition'; end if;
  definition:=replace(definition,'FUNCTION public.search_public_animals_with_storage(','FUNCTION public.search_public_animals_filtered_with_storage(');
  original:=definition;
  definition:=regexp_replace(definition,'\)\s+RETURNS',signature||E'\n RETURNS');
  if definition=original then raise exception 'Storage signature not extended'; end if;
  definition:=replace(definition,'public.search_public_animals(', 'public.search_public_animals_filtered(');
  original:=definition;
  definition:=replace(definition,'p_exact_location, p_max_distance_meters', 'p_exact_location, p_max_distance_meters, p_neutered, p_age_min, p_age_max, p_weight_min, p_weight_max');
  if definition=original then raise exception 'Storage filter arguments not forwarded'; end if;
  execute definition;
end $$;
