import test from 'node:test';
import assert from 'node:assert/strict';
import {createServer} from 'vite';

async function loadHealth(t){
  const server=await createServer({configFile:false,envFile:false,server:{middlewareMode:true,hmr:false},appType:'custom',logLevel:'error'});
  t.after(async()=>{await server.close();});
  return server.ssrLoadModule('/lib/animal-health.ts');
}

// 표현집(2026-09-14 치료·관리 메모 표현집)의 "실제 원문 예외"와, 그 뒤 정한 제외 기준(2026-09-14)을 그대로 검사합니다.
test('memos with only past, negative, preventive or someone else\'s conditions stay 양호·미확인', async t=>{
  const {classifyHealth}=await loadHealth(t);
  for(const memo of [
    '외부구충 및 심장사상충 예방약 투여 완료(7.31)/1차접종(8.3)/2차접종(8.25)/파보 완치!',
    '귀진드기 치료로 임보처에서 지냄 (치료완료), 성묘와도 잘지내고 성격이 매우 좋음',
    '개체관리번호 26418 - 교통사고로 접수되었으나 이상없음',
    '8-34, 50일령, 엄마가 교통사고로 죽고 새끼 네마리만 남았어요, 귀여운 순둥이들',
    '5개월, 심장사상충&파보 음성, 종합&광견병 백신, 심장사상충약',
    '착용품 없음, 대형포획틀 포획, 26.09.10 복부 팽만감- 초음파 검사- 임신 확인',
    '온순. 얌전. 치석. 비만. 콧등 까짐. 꼬리 단미 안됨. 털 상태 양호.',
    '눈곱 조금 있음. 마른 편. 활발함',
    '심장사상충 검사 예정, 예방접종 완료',
    '오래된 상처 흔적 있음, 건강함',
    '온순함','', '   ',
  ]) assert.equal(classifyHealth(memo),'ok',memo);
});

test('general condition, dehydration, ticks and mild symptoms alone do not count as evidence', async t=>{
  const {classifyHealth}=await loadHealth(t);
  for(const memo of [
    '야윔 활력저하',
    '탈수, 영양상태 부족, 진드기',
    '진드기약 처치 및 구충제 투약, 매우마름',
    '유약,쇄약, 기력부족',
    '코 분홍. 눈곱. 콧물 심함. 털 상태 양호.',
    '기침, 코막힘, 감기 증상',
    '설사 있음, 구토',
    '외부기생충 감염, 부분 탈모, 피부 각질',
    '치석. 부정교합. 이빨 깨짐. 치아 거의 없음.',
    '찰과상, 타박상, 콧등 부어 있음',
    '배 쪽 멍울 있음, 염좌 의심',
    '양 눈 백내장. 양 눈 혼탁. 치석. 꼬리 단미 됨.',
    '오른쪽 귀 작은 상처. 콧등 상처. 눈곱.',
  ]) assert.equal(classifyHealth(memo),'ok',memo);
});

test('longer words that merely contain an expression are not evidence', async t=>{
  const {classifyHealth,healthEvidence}=await loadHealth(t);
  assert.equal(classifyHealth('좌안 충혈, 눈곱'),'ok');            // 안충(眼蟲) 아님
  assert.equal(classifyHealth('약 다 처방받음, 구충제 다 처리함'),'ok'); // 다처(다쳐) 아님
  assert.equal(classifyHealth('하늘색 목줄/리드줄이 절단되어 있었음'),'ok'); // 줄이 잘린 것
  assert.equal(classifyHealth('오른쪽 앞다리 절단'),'care');
  assert.deepEqual(healthEvidence('피부 상태 나쁨'),['피부상태나쁨']);   // 부상 아님
  assert.deepEqual(healthEvidence('생식기 옆 상처, 좌 후지 상처 및 출혈'),['상처','출혈']);
});

test('memos naming a current illness, injury or ongoing treatment become 치료·관리', async t=>{
  const {classifyHealth}=await loadHealth(t);
  for(const memo of [
    '심한 안질환, 외부기생충 감염(구충완료)',
    '이마 고름(수술치료 후 회복중), 병원진료 후 완치 뒤 방사예정',
    '교통사고로 폐출혈, 기력소실 .예후불량.',
    '코 주위 및 발 부위 피부병. 털 상태 양호.',
    '왼쪽 다리 파행',
    '생식기 주변 고름 분비물 확인됨',
    '기립불능, 사고의심',
    '야윔 활력저하, 안구 돌출',
    '기력저하, 왼쪽 다리 골절',
    '영양실조, 기립불능',
    '탈수로 수액 처치 중',
    '진드기 감염 심함, 치료 중',
    '유약, 쇠약, 응급조치',
    '피설사, 혈변',
    '모낭충 감염',
    '심장사상충 양성',
    '치석 심함, 구내염',
    '영양 상태 불량(복부팽만)',
    '5마리구조,모질상태불량',
    '마이크로칩 미등록, 건강상태 불량',
    '불량(쇠약)',
    '치료중',
    '입원 중',
    '한 쪽 고환 종양. 치석. 털 상태 양호.',
  ]) assert.equal(classifyHealth(memo),'care',memo);
});

test('one negative or excluded clause does not erase another positive finding, and the evidence is reported', async t=>{
  const {classifyHealth,healthEvidence}=await loadHealth(t);
  assert.equal(classifyHealth('파보 음성, 결막염 심함'),'care');
  assert.equal(classifyHealth('털 상태 양호, 외이염'),'care');
  assert.deepEqual(healthEvidence('파보 음성, 결막염 심함, 진드기, 결막염'),['결막염']);
  assert.deepEqual(healthEvidence('야윔 활력저하'),[]);
});
