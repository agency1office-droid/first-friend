-- Restore the previous query after production LCP failed to improve.
-- Narrow-key sorting improved isolated SQL timing, but did not meet the
-- end-to-end performance acceptance check. Keep the experiment auditable.
CREATE OR REPLACE FUNCTION public.search_public_animals_filtered(p_limit integer DEFAULT 20, p_cursor_updated_at timestamp with time zone DEFAULT NULL::timestamp with time zone, p_cursor_id text DEFAULT NULL::text, p_cursor_distance_meters double precision DEFAULT NULL::double precision, p_lat double precision DEFAULT NULL::double precision, p_lng double precision DEFAULT NULL::double precision, p_sort text DEFAULT 'recent'::text, p_species text DEFAULT NULL::text, p_age_group text DEFAULT NULL::text, p_sex text DEFAULT NULL::text, p_kind_codes text[] DEFAULT NULL::text[], p_color text DEFAULT NULL::text, p_public_phase text DEFAULT NULL::text, p_size_group text DEFAULT NULL::text, p_multiple_photos boolean DEFAULT false, p_exact_location boolean DEFAULT false, p_max_distance_meters double precision DEFAULT NULL::double precision, p_neutered text DEFAULT NULL::text, p_age_min double precision DEFAULT 0, p_age_max double precision DEFAULT 17, p_weight_min double precision DEFAULT 0, p_weight_max double precision DEFAULT 60, p_thumbnail_only boolean DEFAULT false, p_health text DEFAULT NULL::text)
 RETURNS TABLE(id text, name text, species text, breed text, up_kind_cd text, kind_cd text, age text, age_group text, sex text, region text, shelter_id text, shelter_name text, shelter_address text, shelter_phone text, shelter_lat double precision, shelter_lng double precision, approximate_shelter_location boolean, updated text, updated_at timestamp with time zone, image_1 text, image_2 text, colors_json text, traits_json text, summary text, health_json text, life_json text, match_reason text, process_state text, distance_meters double precision, total_count bigint)
 LANGUAGE sql
 STABLE
 SET search_path TO 'public', 'extensions'
AS $function$
with calculated as (
  select a.*, case
    when p_lat between -90 and 90 and p_lng between -180 and 180 and a.shelter_geo is not null
    then ST_Distance(a.shelter_geo, ST_SetSRID(ST_MakePoint(p_lng, p_lat), 4326)::geography)
    else null end as calculated_distance
  from public.visible_public_animals a
  where a.active = true
    and (p_health is null or a.health_state = p_health)
    and (not p_thumbnail_only or (case when coalesce(a.image_1,'')<>'' then a.image_1_storage else a.image_2_storage end) like '%/thumb-v1/%')
    and (p_neutered is null or (position('yes' in p_neutered)>0 and a.health_json like '%중성화 완료로 등록됨%') or (position('no' in p_neutered)>0 and a.health_json like '%중성화되지 않은 것으로 등록됨%'))
    and ((p_age_min=0 and p_age_max>=17) or public.animal_age_years(a.age) is null or public.animal_age_years(a.age) between p_age_min and p_age_max)
    and ((p_weight_min=0 and p_weight_max>=60) or public.animal_weight_kg(a.traits_json) is null or public.animal_weight_kg(a.traits_json) between p_weight_min and p_weight_max)
    and (p_species is null or a.species = p_species)
    and (p_age_group is null or a.age_group = any(string_to_array(p_age_group, ',')))
    and (p_sex is null or a.sex = any(string_to_array(p_sex, ',')))
    and (p_kind_codes is null or cardinality(p_kind_codes) = 0 or a.kind_cd = any(p_kind_codes))
    and (
      p_color is null
      or case lower(trim(p_color))
        when '흰색' then a.color_search like any (array['%흰색%','%백색%','%화이트%','%하얀%','%하양%','%아이보리%'])
        when '검정' then a.color_search like any (array['%검정%','%검은색%','%검은%','%흑색%','%블랙%','%까만색%'])
        when '갈색' then a.color_search like any (array['%갈색%','%갈색계열%','%밤색%','%브라운%','%초콜릿%','%쵸콜릿%','%흑갈색%','%황갈색%','%금갈색%','%연갈색%','%암갈색%','%갈백%','%갈흑%'])
        when '황색' then a.color_search like any (array['%황색%','%황색계열%','%황토색%','%황토%','%노랑%','%노란색%','%옐로우%','%레몬색%','%크림색%','%금색%','%금갈색%','%황갈색%','%옅은 황색%','%엷은 황갈색%','%붉고 엷은 황갈색%','%주황%','%겨자색%','%살구색%','%빨간색%','%베이지%','%탄색%','%고동색말단%'])
        when '회색' then a.color_search like any (array['%회색%','%그레이%','%잿빛%','%은색%','%실버%','%흰회%','%회백%','%회갈%'])
        when '삼색' then a.color_search like any (array['%삼색%','%세가지색%','%칼리코%','%캘리코%','%카오스%','%기타(삼색)%'])
        when '고등어' then a.color_search like any (array['%고등어%','%반고등어%','%고등어태비%','%태비%','%테비%','%줄무늬%','%호랑이무늬%','%호반색%','%얼룩무늬%','%기타(고등어)%'])
        when '치즈' then a.color_search like any (array['%치즈%','%치즈색%','%치즈태비%','%치즈테비%','%기타(치즈)%'])
        when '기타·복합색' then a.color_search like '%기타%'
        else a.color_search like '%' || lower(trim(p_color)) || '%'
      end
    )
    and (p_public_phase is null or a.public_phase = p_public_phase)
    and (p_size_group is null or a.size_group = any(string_to_array(p_size_group, ',')))
    and (not p_multiple_photos or a.has_multiple_photos)
    and (not p_exact_location or a.has_exact_location)
    and (p_max_distance_meters is null or (a.shelter_geo is not null and ST_DWithin(a.shelter_geo, ST_SetSRID(ST_MakePoint(p_lng, p_lat), 4326)::geography, p_max_distance_meters)))
), filtered as (
  select * from calculated c
  where ((p_sort = 'distance' and (
      p_cursor_distance_meters is null
      or (p_cursor_distance_meters < 1e15 and (coalesce(c.calculated_distance, 1e15) > p_cursor_distance_meters or (coalesce(c.calculated_distance, 1e15) = p_cursor_distance_meters and c.id > coalesce(p_cursor_id, ''))))
      or (p_cursor_distance_meters >= 1e15 and c.calculated_distance is null and c.id > coalesce(p_cursor_id, ''))
    )) or (p_sort <> 'distance' and (p_cursor_updated_at is null or c.updated_at < p_cursor_updated_at or (c.updated_at = p_cursor_updated_at and c.id > coalesce(p_cursor_id, '')))))
), counted as (
  select f.*, count(*) over () as result_count
  from filtered f
  where p_cursor_updated_at is null and p_cursor_distance_meters is null and p_cursor_id is null
), uncounted as (
  select f.*, 0::bigint as result_count
  from filtered f
  where not (p_cursor_updated_at is null and p_cursor_distance_meters is null and p_cursor_id is null)
), result as (
  select * from counted
  union all
  select * from uncounted
)
select r.id, r.name, r.species, r.breed, r.up_kind_cd, r.kind_cd, r.age, r.age_group, r.sex, r.region, r.shelter_id, r.shelter_name,
  r.shelter_address, r.shelter_phone, r.shelter_lat::double precision, r.shelter_lng::double precision, r.approximate_shelter_location,
  r.updated, r.updated_at, r.image_1, r.image_2, r.colors_json, r.traits_json, r.summary, r.health_json, r.life_json, r.match_reason,
  r.process_state, r.calculated_distance, r.result_count
from result r
order by case when p_sort = 'distance' then coalesce(r.calculated_distance, 1e15) end asc,
  case when p_sort <> 'distance' then r.updated_at end desc, r.id asc
limit least(greatest(coalesce(p_limit, 20), 1), 50);
$function$

