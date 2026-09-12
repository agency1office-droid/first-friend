import test from 'node:test';
import assert from 'node:assert/strict';
import {createServer} from 'vite';

async function loadWorldcup(t){
  const server=await createServer({configFile:false,envFile:false,server:{middlewareMode:true,hmr:false},appType:'custom',logLevel:'error'});
  t.after(async()=>{await server.close();});
  return server.ssrLoadModule('/lib/worldcup.ts');
}

// 공공 데이터 Animal의 최소 형태만 흉내 냅니다. 사진·공고 문구·나이대·털색이 로직에 쓰이는 전부입니다.
function animal(id,overrides={}){
  return {id,name:`친구${id}`,image:`https://img/${id}.jpg`,life:[],ageGroup:'어린 친구',colors:['흰색'],...overrides};
}
const notice=(start,end)=>`공고 ${start} ~ ${end}`;
const answers={species:'dog',scope:'nearby',size:'large,xlarge',age:'young',color:'흰색'};
const seoul={lat:37.57,lng:126.98};

test('pool queries relax color, age, size, then region in that order', async t=>{
  const {poolQueries}=await loadWorldcup(t);
  const queries=poolQueries(answers,seoul).map(q=>new URLSearchParams(q));
  assert.equal(queries.length,5);
  // 첫 요청은 모든 조건과 좌표, 거리순을 담습니다.
  assert.equal(queries[0].get('species'),'dog');
  assert.equal(queries[0].get('size'),'large,xlarge');
  assert.equal(queries[0].get('age'),'young');
  assert.equal(queries[0].get('color'),'흰색');
  assert.equal(queries[0].get('sort'),'distance');
  assert.equal(queries[0].get('lat'),'37.57');
  assert.equal(queries[0].get('limit'),'50');
  // 털색 → 나이대 → 크기 순으로 빠집니다.
  assert.equal(queries[1].get('color'),null); assert.equal(queries[1].get('age'),'young');
  assert.equal(queries[2].get('age'),null); assert.equal(queries[2].get('size'),'large,xlarge');
  assert.equal(queries[3].get('size'),null); assert.equal(queries[3].get('sort'),'distance');
  // 마지막은 전국 최신순이고 종은 끝까지 유지됩니다.
  assert.equal(queries[4].get('sort'),'recent'); assert.equal(queries[4].get('lat'),null); assert.equal(queries[4].get('species'),'dog');
});

test('pool queries skip duplicate steps and use recent order without coordinates', async t=>{
  const {poolQueries}=await loadWorldcup(t);
  const queries=poolQueries({...answers,size:'all',age:'all',color:'all',scope:'nationwide'},null);
  assert.deepEqual(queries.map(q=>new URLSearchParams(q).get('sort')),['recent']);
  const nearbyWithoutLocation=poolQueries(answers,null).map(q=>new URLSearchParams(q).get('sort'));
  assert.ok(nearbyWithoutLocation.every(sort=>sort==='recent'));
});

test('pool keeps matched animals in request order and fills the rest by notice deadline', async t=>{
  const {pickPool}=await loadWorldcup(t);
  const primary=[animal('a'),animal('b',{image:' '}),animal('c'),animal('a')];
  const fallback=[
    animal('late',{life:[notice('2026. 9. 1.','2026. 9. 30.')]}),
    animal('undated',{life:['공고 기간은 상세 상담에서 확인해 주세요']}),
    animal('soon',{life:[notice('2026. 9. 5.','2026. 9. 12.')]}),
    animal('soon-older',{life:[notice('2026. 9. 1.','2026. 9. 12.')]}),
    animal('c'),
  ];
  const {pool,matched,filled}=pickPool([primary,fallback],4);
  assert.deepEqual(pool.map(item=>item.id),['a','c','soon-older','soon']);
  assert.equal(matched,2);
  assert.equal(filled,2);
});

test('pool is empty when fewer than two animals have photos', async t=>{
  const {pickPool}=await loadWorldcup(t);
  assert.deepEqual(pickPool([[animal('only'),animal('blank',{image:''})]],16).pool,[]);
});

test('a 16 bracket ends after exactly 15 choices with the chosen friend winning', async t=>{
  const {startBracket,currentPair,choose,isDone,winnerOf,roundLabel,progress}=await loadWorldcup(t);
  const pool=Array.from({length:16},(_,index)=>animal(String(index)));
  let bracket=startBracket(pool,()=>0.5);
  assert.deepEqual(new Set(bracket.round.map(item=>item.id)),new Set(pool.map(item=>item.id)));
  const labels=[];
  let picks=0;
  while(!isDone(bracket)){
    const pair=currentPair(bracket);
    assert.equal(pair.length,2);
    labels.push(roundLabel(bracket.round.length));
    // 항상 id가 '7'인 친구가 있으면 그 친구를, 없으면 왼쪽을 고릅니다.
    bracket=choose(bracket,pair.find(item=>item.id==='7')||pair[0]);
    picks+=1;
  }
  assert.equal(picks,15);
  assert.equal(winnerOf(bracket).id,'7');
  assert.deepEqual([...new Set(labels)],['16강','8강','4강','결승']);
  assert.equal(progress(bracket),1);
  assert.equal(bracket.picks.length,15);
});

test('find link keeps answered filters and infers only the open ones from picks', async t=>{
  const {buildFindHref}=await loadWorldcup(t);
  const picks=[animal('1',{ageGroup:'어른 친구',colors:['검정']}),animal('2',{ageGroup:'어른 친구',colors:['갈색']}),animal('3',{ageGroup:'어린 친구',colors:['검정']})];
  const answered=new URL(buildFindHref(answers,picks),'https://x');
  assert.equal(answered.pathname,'/find');
  assert.equal(answered.searchParams.get('size'),'large,xlarge');
  assert.equal(answered.searchParams.get('age'),'young');
  assert.equal(answered.searchParams.get('color'),'흰색');
  assert.equal(answered.searchParams.get('sort'),null);
  const inferred=new URL(buildFindHref({...answers,scope:'nationwide',size:'all',age:'all',color:'all'},picks),'https://x');
  assert.equal(inferred.searchParams.get('size'),null);
  assert.equal(inferred.searchParams.get('age'),'mature');
  assert.equal(inferred.searchParams.get('color'),'검정');
  assert.equal(inferred.searchParams.get('sort'),'recent');
});
