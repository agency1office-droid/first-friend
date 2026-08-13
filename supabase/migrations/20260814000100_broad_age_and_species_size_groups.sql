-- 검색 필터를 사용자가 이해하기 쉬운 큰 범주로 통일합니다.
-- 나이: 1살 이하 / 2~5살 / 6~10살 / 11살 이상 / 미상
-- 크기: 종별로 소형 / 중형 / 대형 / 초대형 / 미상

update public.public_animals
set age_group = case
  when age ~ '60일\s*미만' then '어린 친구'
  when age ~ '(19|20)[0-9]{2}' and extract(year from current_date) - substring(age from '((19|20)[0-9]{2})')::integer <= 1 then '어린 친구'
  when age ~ '[0-9]+(\.[0-9]+)?\s*개월' and substring(age from '([0-9]+(\.[0-9]+)?)\s*개월')::numeric < 12 then '어린 친구'
  when age ~ '[0-9]+(\.[0-9]+)?\s*살' and substring(age from '([0-9]+(\.[0-9]+)?)\s*살')::numeric <= 1 then '어린 친구'
  when age ~ '(19|20)[0-9]{2}' and extract(year from current_date) - substring(age from '((19|20)[0-9]{2})')::integer <= 5 then '청년 친구'
  when age ~ '[0-9]+(\.[0-9]+)?\s*개월' and substring(age from '([0-9]+(\.[0-9]+)?)\s*개월')::numeric < 72 then '청년 친구'
  when age ~ '[0-9]+(\.[0-9]+)?\s*살' and substring(age from '([0-9]+(\.[0-9]+)?)\s*살')::numeric <= 5 then '청년 친구'
  when age ~ '(19|20)[0-9]{2}' and extract(year from current_date) - substring(age from '((19|20)[0-9]{2})')::integer <= 10 then '어른 친구'
  when age ~ '[0-9]+(\.[0-9]+)?\s*개월' and substring(age from '([0-9]+(\.[0-9]+)?)\s*개월')::numeric < 132 then '어른 친구'
  when age ~ '[0-9]+(\.[0-9]+)?\s*살' and substring(age from '([0-9]+(\.[0-9]+)?)\s*살')::numeric <= 10 then '어른 친구'
  when age ~ '(19|20)[0-9]{2}' or age ~ '[0-9]+(\.[0-9]+)?\s*(개월|살)' then '나이 많은 친구'
  else '나이 미상'
end;

update public.public_animals
set size_group = case
  when traits_json !~* '[0-9]+(\.[0-9]+)?\s*kg' then 'unknown'
  when species = '고양이' and substring(traits_json from '([0-9]+(\.[0-9]+)?)\s*kg')::numeric < 3 then 'small'
  when species = '고양이' and substring(traits_json from '([0-9]+(\.[0-9]+)?)\s*kg')::numeric < 6 then 'medium'
  when species = '고양이' and substring(traits_json from '([0-9]+(\.[0-9]+)?)\s*kg')::numeric < 10 then 'large'
  when species = '고양이' then 'xlarge'
  when substring(traits_json from '([0-9]+(\.[0-9]+)?)\s*kg')::numeric < 5 then 'small'
  when substring(traits_json from '([0-9]+(\.[0-9]+)?)\s*kg')::numeric < 15 then 'medium'
  when substring(traits_json from '([0-9]+(\.[0-9]+)?)\s*kg')::numeric < 30 then 'large'
  else 'xlarge'
end;

create index if not exists idx_public_animals_feed_age_size
  on public.public_animals (age_group, size_group, updated_at desc, id desc)
  where active = true;
