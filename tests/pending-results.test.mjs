import {readFile} from 'node:fs/promises';
import {runInNewContext} from 'node:vm';
import test from 'node:test';
import assert from 'node:assert/strict';
import ts from 'typescript';

test('guest results survive login and retries, and sync once without losing other runs', async () => {
  const source = await readFile(new URL('../lib/pending-results.ts',import.meta.url),'utf8');
  const js = ts.transpileModule(source,{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText;
  const store = new Map(), calls = [], events = [];
  let status = 401;
  const exports = {};
  runInNewContext(js,{exports,Event,localStorage:{getItem:k=>store.get(k),setItem:(k,v)=>store.set(k,v)},window:{dispatchEvent:e=>events.push(e.type)},fetch:async(url,options)=>{calls.push({url,body:JSON.parse(options.body)}); return new Response('{}',{status});}});
  assert.equal(await exports.saveWorldcupResult('run1','animal','2026-09-22'), 'login');
  assert.equal(await exports.saveWorldcupResult('run1','animal','2026-09-22'), 'login');
  await exports.saveWorldcupResult('run2','animal','2026-09-22');
  assert.equal(JSON.parse([...store.values()][0]).length,2);
  await exports.syncPendingResults();
  assert.equal(JSON.parse([...store.values()][0]).length,2,'401 retains results');
  status = 503; await exports.syncPendingResults();
  assert.equal(JSON.parse([...store.values()][0]).length,2,'failure retains results');
  status = 200;
  const before = calls.length;
  await Promise.all([exports.syncPendingResults(),exports.syncPendingResults()]);
  assert.equal(calls.length-before,2,'parallel mounts share one sync');
  assert.equal(JSON.parse([...store.values()][0]).length,0);
  assert.equal(events.length,2);
});

test('worldcup API keeps separate runs, retries idempotently and isolates members', async () => {
  const source = await readFile(new URL('../app/api/result-cards/route.ts',import.meta.url),'utf8');
  const js = ts.transpileModule(source,{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText;
  const rows = new Map(); let member = 'alice';
  const db = { from(table) {
    let owner, run, start = 0, end = 20;
    const query = {
      select(){return this;}, eq(k,v){if(k==='member_id')owner=v;else if(k==='run_id')run=v;return this;},
      order(){return this;},range(a,b){start=a;end=b;return this;},
      async maybeSingle(){return {data:rows.get(owner+':'+run)??null,error:null};},
      async upsert(row){const key=row.member_id+':'+row.run_id;if(!rows.has(key))rows.set(key,row);return {error:null};},
      then(resolve){return Promise.resolve({data:table==='member_quiz_completions'?[]:[...rows.values()].filter(r=>r.member_id===owner).slice(start,end+1),error:null}).then(resolve);},
    }; return query;
  }};
  const exports = {};
  runInNewContext(js,{exports,Response,URL,require:name=>name.includes('chatgpt-auth')?{getChatGPTUser:async()=>member?{userId:member,displayName:member}:null}:name.includes('supabase')?{getSupabaseServerClient:()=>db}:name.includes('public-data')?{getAnimalById:async id=>({id,name:'믹스견 · 001',age:'2023(년생)',sex:'암컷',region:'서울특별시 마포구',shelter:'보호센터',thumbnail:'https://example.com/photo.webp',image:'',species:'강아지'})}:{completionDate:()=> '2026-09-22T00:00:00.000Z',legacyQuizCard:()=>null}});
  const post = (runId, origin='https://firstfriend.test') => exports.POST(new Request('https://firstfriend.test/api/result-cards',{method:'POST',headers:{origin,'content-type':'application/json'},body:JSON.stringify({runId,animalId:'same',member_id:'bob'})}));
  const run1='aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',run2='bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb';
  assert.equal((await post(run1)).status,200);
  assert.equal((await post(run1)).status,200);
  assert.equal(rows.size,1);
  assert.equal((await post(run2)).status,200);
  assert.equal(rows.size,2);
  assert.ok([...rows.values()].every(row=>row.member_id==='alice'));
  member='bob';
  assert.equal((await (await exports.GET(new Request('https://firstfriend.test/api/result-cards'))).json()).worldcup.length,0);
  assert.equal((await post(run1,'https://other.test')).status,403);
  assert.equal((await post('bad')).status,400);
  member=null;
  assert.equal((await post(run1)).status,401);
  assert.equal((await exports.GET(new Request('https://firstfriend.test/api/result-cards'))).status,401);
});
