-- 이상형 월드컵은 서버 썸네일(webp)이 이미 있는 친구만 받습니다. 검색 RPC에 p_thumbnail_only를 더합니다.
-- 기존 22개 인자 정의는 지웁니다. 남겨 두면 PostgREST가 두 후보 사이에서 함수를 고르지 못합니다.
-- 목록 화면의 fromStored()와 같은 기준입니다: 첫 사진이 있으면 그 저장 주소, 없으면 둘째 사진의 저장 주소가 /thumb-v1/ 이어야 합니다.
do $$
declare filtered_def text; storage_def text; original text; extended_types text;
begin
  extended_types := 'integer,timestamp with time zone,text,double precision,double precision,double precision,text,text,text,text,text[],text,text,text,boolean,boolean,double precision,text,double precision,double precision,double precision,double precision';
  select pg_get_functiondef(to_regprocedure('public.search_public_animals_filtered(' || extended_types || ')')) into filtered_def;
  if filtered_def is null or position('where a.active = true' in filtered_def)=0 then raise exception 'Expected 22-argument filtered search definition'; end if;
  select pg_get_functiondef(to_regprocedure('public.search_public_animals_filtered_with_storage(' || extended_types || ')')) into storage_def;
  if storage_def is null then raise exception 'Expected 22-argument storage search definition'; end if;

  original:=filtered_def;
  filtered_def:=replace(filtered_def,'p_weight_max double precision DEFAULT 60)','p_weight_max double precision DEFAULT 60, p_thumbnail_only boolean DEFAULT false)');
  if filtered_def=original then raise exception 'Filtered signature not extended'; end if;
  original:=filtered_def;
  filtered_def:=replace(filtered_def,'where a.active = true', $filters$where a.active = true
    and (not p_thumbnail_only or (case when coalesce(a.image_1,'')<>'' then a.image_1_storage else a.image_2_storage end) like '%/thumb-v1/%')$filters$);
  if filtered_def=original then raise exception 'Thumbnail filter not added'; end if;

  original:=storage_def;
  storage_def:=replace(storage_def,'p_weight_max double precision DEFAULT 60)','p_weight_max double precision DEFAULT 60, p_thumbnail_only boolean DEFAULT false)');
  if storage_def=original then raise exception 'Storage signature not extended'; end if;
  original:=storage_def;
  storage_def:=replace(storage_def,'p_age_max, p_weight_min, p_weight_max','p_age_max, p_weight_min, p_weight_max, p_thumbnail_only');
  if storage_def=original then raise exception 'Thumbnail argument not forwarded'; end if;

  execute 'drop function public.search_public_animals_filtered_with_storage(' || extended_types || ')';
  execute 'drop function public.search_public_animals_filtered(' || extended_types || ')';
  execute filtered_def;
  execute storage_def;
  if to_regprocedure('public.search_public_animals_filtered_with_storage(' || extended_types || ',boolean)') is null then
    raise exception 'Expected 23-argument storage search was not created';
  end if;
end $$;
