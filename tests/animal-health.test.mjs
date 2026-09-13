import test from 'node:test';
import assert from 'node:assert/strict';
import {createServer} from 'vite';

async function loadHealth(t){
  const server=await createServer({configFile:false,envFile:false,server:{middlewareMode:true,hmr:false},appType:'custom',logLevel:'error'});
  t.after(async()=>{await server.close();});
  return server.ssrLoadModule('/lib/animal-health.ts');
}

// 표현집(2026-09-14 치료·관리 메모 표현집)의 "실제 원문 예외"를 그대로 검사합니다.
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

test('memos naming a current illness, injury or ongoing treatment become 치료·관리', async t=>{
  const {classifyHealth}=await loadHealth(t);
  for(const memo of [
    '심한 안질환, 외부기생충 감염(구충완료)',
    '이마 고름(수술치료 후 회복중), 병원진료 후 완치 뒤 방사예정',
    '교통사고로 폐출혈, 기력소실 .예후불량.',
    '코 주위 및 발 부위 피부병. 털 상태 양호.',
    '왼쪽 다리 파행',
    '생식기 주변 고름 분비물 확인됨',
    '매우마름',
    '기립불능, 사고의심',
    '기력 매우 저하, 안구 돌출',
    '영양 상태 불량(복부팽만)',
    '쇠약, 외부 기생충 감염',
    '설사 있음',
    '심장사상충 양성',
    '치석 심함, 구내염',
    '치료중',
    '입원 중',
    '한 쪽 고환 종양. 치석. 털 상태 양호.',
  ]) assert.equal(classifyHealth(memo),'care',memo);
});

test('one negative test does not erase another positive finding in the same memo', async t=>{
  const {classifyHealth}=await loadHealth(t);
  assert.equal(classifyHealth('파보 음성, 결막염 심함'),'care');
  assert.equal(classifyHealth('털 상태 양호, 기력저하'),'care');
});
