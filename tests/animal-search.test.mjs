import test from 'node:test';
import assert from 'node:assert/strict';
import {createServer} from 'vite';

test('animal feed filters stay in SQL and empty results never read the full feed', async t => {
  const server=await createServer({configFile:false,envFile:false,server:{middlewareMode:true,hmr:false},appType:'custom',logLevel:'error'});
  const oldFetch=globalThis.fetch, oldUrl=process.env.NEXT_PUBLIC_SUPABASE_URL, oldKey=process.env.SUPABASE_SECRET_KEY;
  process.env.NEXT_PUBLIC_SUPABASE_URL='https://search.example.test';process.env.SUPABASE_SECRET_KEY='test-only';
  t.after(async()=>{globalThis.fetch=oldFetch;for(const [key,value] of [['NEXT_PUBLIC_SUPABASE_URL',oldUrl],['SUPABASE_SECRET_KEY',oldKey]]){if(value===undefined)delete process.env[key];else process.env[key]=value;}await server.close();});
  const calls=[];let rows=[];
  globalThis.fetch=async(url,options)=>{
    const path=new URL(url).pathname;calls.push(path);
    if(path.endsWith('/public_sync_state'))return Response.json([{last_completed_at:new Date().toISOString()}]);
    assert.ok(path.endsWith('/rpc/search_public_animals_filtered_with_storage'),path);
    const params=JSON.parse(options.body);
    assert.equal(params.p_neutered,'yes');assert.equal(params.p_size_group,'small');assert.equal(params.p_age_max,5);assert.equal(params.p_weight_max,10);
    // 썸네일 필터는 월드컵이 요청할 때만 RPC 인자로 갑니다. 홈 목록 요청은 인자 자체를 보내지 않습니다.
    assert.equal(params.p_thumbnail_only,expectThumbnailOnly?true:undefined);
    return Response.json(rows);
  };
  const {getNearbyAnimalsPage}=await server.ssrLoadModule('/lib/public-animal-store.ts');
  let expectThumbnailOnly=true;
  const thumbnailOnly=await getNearbyAnimalsPage({neutered:'yes',sizeGroup:'small',ageMax:5,weightMax:10,limit:1,thumbnailOnly:true});
  assert.deepEqual(thumbnailOnly.items,[]);assert.equal(calls.length,2);
  expectThumbnailOnly=false;calls.length=0;
  const options={neutered:'yes',sizeGroup:'small',ageMax:5,weightMax:10,limit:1};
  const empty=await getNearbyAnimalsPage(options);
  assert.deepEqual(empty.items,[]);assert.equal(empty.total,0);assert.equal(empty.nextCursor,null);assert.equal(calls.length,2);
  rows=[{id:'aa',name:'test',species:'강아지',age:'2살',image_1:'https://openapi.animal.go.kr/a',image_2:'',colors_json:'[]',traits_json:'[]',health_json:'[]',life_json:'[]',distance_meters:null,total_count:2,updated_at:'2026-09-01T00:00:00Z'}];
  const first=await getNearbyAnimalsPage({...options,sort:'distance',lat:37.5,lng:127});
  assert.equal(first.items[0].distanceMeters,undefined,'unknown distance must not become zero');
  assert.equal(JSON.parse(Buffer.from(first.nextCursor,'base64url').toString()).distanceMeters,1e15);
  rows=[];const end=await getNearbyAnimalsPage({...options,cursor:first.nextCursor});
  assert.equal(end.nextCursor,null);assert.equal(calls.length,6,'every request has only state plus paginated RPC');
});
