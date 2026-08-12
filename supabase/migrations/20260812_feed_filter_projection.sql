-- 퍼스트프렌드 목록 검색 필터 projection
-- 3단계: 공고 상태와 털색을 매 요청마다 JSON 파싱하지 않도록 합니다.

alter table public.public_animals
  add column if not exists color_search text not null default '';

-- life_json의 공고 기간에서 마지막 날짜를 날짜형으로 옮깁니다.
update public.public_animals a
set notice_end_at = to_date(
  regexp_replace(substring(a.life_json from '.*(\d{4}\D+\d{1,2}\D+\d{1,2})'), '[^0-9]+', '-', 'g'),
  'YYYY-FMMM-FMDD'
)::timestamptz
where a.notice_end_at is null
  and a.life_json ~ '\d{4}\D+\d{1,2}\D+\d{1,2}';

-- 현재 health_json / life_json에 저장된 공개 상태를 검색용 값으로 옮깁니다.
update public.public_animals
set public_phase = case
  when lower(coalesce(health_json, '')) like '%종료%' then 'ended'
  when lower(coalesce(life_json, '')) like '%공고 %'
    and notice_end_at is not null
    and notice_end_at < now() then 'checking'
  when lower(coalesce(life_json, '')) like '%공고 %' then 'notice'
  else 'unknown'
end
where public_phase is null;

-- 색상 원문을 소문자 검색용으로 한 번만 저장합니다.
update public.public_animals
set color_search = lower(coalesce(colors_json, ''))
where color_search = '';

create index if not exists idx_public_animals_feed_phase
  on public.public_animals (public_phase, updated_at desc, id desc)
  where active = true;

create index if not exists idx_public_animals_feed_color
  on public.public_animals (color_search)
  where active = true;
