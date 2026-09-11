import test from 'node:test';
import assert from 'node:assert/strict';
import {createServer} from 'vite';

async function loadRegionModule(t){
  const server=await createServer({configFile:false,envFile:false,server:{middlewareMode:true,hmr:false},appType:'custom',logLevel:'error'});
  t.after(async()=>{await server.close();});
  return server.ssrLoadModule('/lib/lost-region.ts');
}

test('lost animal listing never crosses the visitor district', async t => {
  const {lostRegionQuery,provinceVariants}=await loadRegionModule(t);

  // 구까지만 아는 방문자는 구가 상한이고 동 가산점이 없습니다.
  assert.deepEqual(lostRegionQuery('서울시 성북구'),{provinces:['서울'],prefix:'성북구',dong:null});
  // 동을 알아도 상한은 구이며 동은 정렬에만 씁니다.
  assert.deepEqual(lostRegionQuery('서울특별시 성북구 정릉동'),{provinces:['서울'],prefix:'성북구',dong:'성북구 정릉동'});
  // 행정구가 있는 특례시는 구까지 좁힙니다.
  assert.deepEqual(lostRegionQuery('경기도 수원시 팔달구 매교동'),{provinces:['경기'],prefix:'수원시 팔달구',dong:'수원시 팔달구 매교동'});
  // 행정구가 없으면 시·군이 상한입니다.
  assert.deepEqual(lostRegionQuery('강원특별자치도 춘천시 효자동'),{provinces:['강원'],prefix:'춘천시',dong:'춘천시 효자동'});
  assert.deepEqual(lostRegionQuery('경상남도 김해시'),{provinces:['경남','경상남'],prefix:'김해시',dong:null});
  // 기초자치단체가 없는 단층제 지역은 읍·면이 상한입니다.
  assert.deepEqual(lostRegionQuery('세종특별자치시 조치원읍'),{provinces:['세종'],prefix:'조치원읍',dong:null});

  // 시도까지만 알면 넘지 말아야 할 경계를 모르므로 노출하지 않습니다.
  assert.equal(lostRegionQuery('경기도'),null);
  assert.equal(lostRegionQuery('서울시'),null);
  assert.equal(lostRegionQuery(''),null);

  // 같은 시도를 개편 전후 표기로 적은 데이터를 모두 잡습니다.
  assert.deepEqual(provinceVariants('전북'),['전북','전라북']);
  assert.deepEqual(provinceVariants('서울'),['서울']);
  assert.deepEqual(lostRegionQuery('전북특별자치도 전주시 완산구').provinces,['전북','전라북']);
  assert.deepEqual(lostRegionQuery('전라북도 전주시 완산구').provinces,['전북','전라북']);
});

test('lost animal freshness and card region come from the incident address', async t => {
  const {lostHappenedOn,lostDisplayRegion,lostFreshnessCutoff,LOST_FRESHNESS_DAYS}=await loadRegionModule(t);

  // 공공 API가 주는 여러 날짜 표기를 date 컬럼에 넣을 수 있는 값으로 바꿉니다.
  assert.equal(lostHappenedOn('2026-09-06 17:00'),'2026-09-06');
  assert.equal(lostHappenedOn('20260906'),'2026-09-06');
  assert.equal(lostHappenedOn('2026.9.6'),'2026-09-06');
  assert.equal(lostHappenedOn('발생일 미상'),null);
  assert.equal(lostHappenedOn('2026-13-06'),null,'잘못된 월은 date 컬럼에 넣지 않습니다');
  assert.equal(lostHappenedOn(''),null);

  // 카드에는 관할 기관명이 아니라 실제 발생지의 시·군·구와 동을 보여줍니다.
  assert.equal(lostDisplayRegion('서울특별시 성북구 정릉동 산87-1','서울특별시 성북구'),'성북구 정릉동');
  assert.equal(lostDisplayRegion('경기도 수원시 팔달구 매교동 1',''),'팔달구 매교동');
  assert.equal(lostDisplayRegion('','서울특별시 성북구'),'성북구','주소가 없으면 기관명으로 폴백합니다');
  assert.equal(lostDisplayRegion('','지역 미상'),'지역 미상');

  assert.equal(LOST_FRESHNESS_DAYS,90);
  assert.equal(lostFreshnessCutoff(new Date('2026-09-10T00:00:00Z')),'2026-06-12');
});

test('duplicate public notices never fill the district list with one animal', async t => {
  const server=await createServer({configFile:false,envFile:false,server:{middlewareMode:true,hmr:false},appType:'custom',logLevel:'error'});
  const oldFetch=globalThis.fetch, oldUrl=process.env.NEXT_PUBLIC_SUPABASE_URL, oldKey=process.env.SUPABASE_SECRET_KEY;
  process.env.NEXT_PUBLIC_SUPABASE_URL='https://lost.example.test';process.env.SUPABASE_SECRET_KEY='test-only';
  t.after(async()=>{globalThis.fetch=oldFetch;for(const [key,value] of [['NEXT_PUBLIC_SUPABASE_URL',oldUrl],['SUPABASE_SECRET_KEY',oldKey]]){if(value===undefined)delete process.env[key];else process.env[key]=value;}await server.close();});

  const row=(id,image,address)=>({id,legacy_id:id,species:'강아지',breed:'말티즈',sex:'암컷',age:'11살',color:'흰색',happened_at:'2026년 9월 2일',region:'서울특별시 성북구',address,place:address,description:'특징',image});
  let params=null;
  globalThis.fetch=async(url,options)=>{
    const path=new URL(url).pathname;
    assert.ok(path.endsWith('/rpc/search_public_lost_animals_nearby'),path);
    params=JSON.parse(options.body);
    // 공공 API가 같은 등록 사진으로 같은 건을 세 번 실은 상황입니다.
    return Response.json([
      row('a','https://img.test/one.jpg','서울특별시 성북구 정릉동 1'),
      row('b','https://img.test/one.jpg','서울특별시 성북구 정릉동 1'),
      row('c','https://img.test/one.jpg','서울특별시 성북구 정릉동 1'),
      row('d','https://img.test/two.jpg','서울특별시 성북구 길음동 2'),
    ]);
  };

  const {getNearbyStoredLostAnimals}=await server.ssrLoadModule('/lib/public-animal-store.ts');
  const animals=await getNearbyStoredLostAnimals({provinces:['서울'],prefix:'성북구',dong:'성북구 정릉동'},2);

  assert.deepEqual(params.p_provinces,['서울']);
  assert.equal(params.p_prefix,'성북구');
  assert.equal(params.p_dong,'성북구 정릉동');
  assert.equal(params.p_limit,6,'중복을 걷어낸 뒤에도 목록이 차도록 넉넉히 받아옵니다');
  assert.deepEqual(animals.map(animal=>animal.id),['a','d'],'같은 등록 사진은 한 건으로 합칩니다');
});
