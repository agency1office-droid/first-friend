-- 크기(size_group)는 품종으로만 나눕니다. 공공데이터 품종명을 정규화한 뒤 표와 정확히 일치할 때만 소형~초대형을 주고,
-- 믹스견·믹스묘·한국 고양이·기타·품종 미상은 unknown이라 크기 필터의 "상관없음"에서만 보입니다. 체중은 더 이상 보지 않습니다.
-- lib/public-animal-store.ts의 breedSizeTable과 같은 표를 유지해야 합니다(tests/rendered-html.test.mjs가 두 표를 비교합니다).
create or replace function public.animal_size_group(species text, breed text, traits text)
returns text language sql immutable set search_path=public as $$
  select coalesce((
    select t.size_group from (values
      ('푸들','small'), ('토이푸들','small'), ('미니어쳐푸들','small'), ('말티즈','small'), ('포메라니안','small'), ('비숑프리제','small'), ('치와와','small'), ('시츄','small'), ('스피츠','small'), ('재패니즈스피츠','small'), ('요크셔테리어','small'), ('이탈리안그레이하운드','small'), ('미니어쳐핀셔','small'), ('빠삐용콘티넨탈토이스파니엘','small'), ('빠삐용','small'), ('파피용','small'), ('퍼그','small'), ('페키니즈','small'), ('라사압소','small'), ('미니어쳐슈나우저','small'), ('슈나우져','small'), ('슈나우저','small'), ('캐벌리어킹찰스스파니엘','small'), ('닥스훈트','small'), ('보스턴테리어','small'), ('잭러셀테리어','small'), ('먼치킨','small'), ('싱가푸라','small'),
      ('진도견','medium'), ('진돗개','medium'), ('시바','medium'), ('프렌치불독','medium'), ('보더콜리','medium'), ('웰시코기펨브로크','medium'), ('웰시코기카디건','medium'), ('웰시코기','medium'), ('코카스파니엘','medium'), ('아메리칸코카스파니엘','medium'), ('미디엄푸들','medium'), ('비글','medium'), ('스탠다드닥스훈트','medium'), ('라이카','medium'), ('불테리어','medium'), ('페르시안','medium'), ('페르시안페르시안친칠라','medium'), ('러시안블루','medium'), ('브리티시쇼트헤어','medium'), ('스코티시폴드','medium'), ('하일랜드폴드','medium'), ('터키시앙고라','medium'), ('샴','medium'), ('아메리칸쇼트헤어','medium'), ('스핑크스','medium'), ('아비시니안','medium'),
      ('골든리트리버','large'), ('라브라도리트리버','large'), ('래브라도리트리버','large'), ('플랫코티드리트리버','large'), ('시베리안허스키','large'), ('허스키','large'), ('스탠다드푸들','large'), ('사모예드','large'), ('마리노이즈','large'), ('삽살개','large'), ('차우차우','large'), ('풍산견','large'), ('그레이하운드','large'), ('도베르만','large'), ('올드잉글리쉬불독','large'), ('와이마라너','large'), ('포인터','large'), ('셰퍼드','large'), ('저먼셰퍼드','large'), ('콜리','large'), ('비즐라','large'), ('샤페이','large'), ('달마시안','large'), ('아키다','large'), ('벵갈','large'),
      ('도사','xlarge'), ('아메리칸아키다','xlarge'), ('말라뮤트','xlarge'), ('알래스칸말라뮤트','xlarge'), ('알래스칸맬러뮤트','xlarge'), ('그레이트데인','xlarge'), ('마스티프','xlarge'), ('세인트버나드','xlarge'), ('뉴펀들랜드','xlarge'), ('로트와일러','xlarge'), ('버니즈마운틴독','xlarge'), ('그레이트피레니즈','xlarge'), ('메인쿤','xlarge'), ('랙돌','xlarge'), ('노르웨이숲','xlarge'), ('사바나','xlarge')
    ) as t(breed, size_group)
    where t.breed = lower(regexp_replace(coalesce(animal_size_group.breed, ''), '[[:space:]·()_-]', '', 'g'))
    limit 1
  ), 'unknown');
$$;

update public.public_animals set size_group = public.animal_size_group(species, breed, traits_json)
where size_group is distinct from public.animal_size_group(species, breed, traits_json);
