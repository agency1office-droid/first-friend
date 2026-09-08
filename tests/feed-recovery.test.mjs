import assert from 'node:assert/strict';
import test from 'node:test';
import {createServer} from 'vite';

test('animal feed retries the failed page and ignores outdated location and pagination responses', async t => {
  const slots=[],effects=[],listeners=new Map(),storage=new Map();let index=0,dirty=true,result;
  const same=(a,b)=>a&&b&&a.length===b.length&&a.every((value,i)=>Object.is(value,b[i]));
  const hooks={
    useState(initial){const i=index++;if(!slots[i])slots[i]={value:typeof initial==='function'?initial():initial};return [slots[i].value,value=>{const next=typeof value==='function'?value(slots[i].value):value;if(!Object.is(next,slots[i].value)){slots[i].value=next;dirty=true;}}];},
    useRef(value){const i=index++;return slots[i] ||= {current:value};},
    useCallback(fn,deps){const i=index++;if(!same(slots[i]?.deps,deps))slots[i]={value:fn,deps};return slots[i].value;},
    useEffect(fn,deps){const i=index++;if(!same(slots[i]?.deps,deps)){const previous=slots[i];slots[i]={deps};effects.push(()=>{previous?.cleanup?.();slots[i].cleanup=fn();});}},
  };
  globalThis.__feedRecoveryHooks=hooks;
  const original={window:globalThis.window,fetch:globalThis.fetch};
  const store={getItem:key=>storage.get(key)||null,setItem:(key,value)=>storage.set(key,value)};
  globalThis.window={location:new URL('http://localhost/'),localStorage:store,sessionStorage:store,scrollY:0,
    history:{scrollRestoration:'auto',replaceState(_state,_title,url){window.location=new URL(url,'http://localhost');}},
    setTimeout,clearTimeout,requestAnimationFrame:fn=>setTimeout(fn,0),cancelAnimationFrame:clearTimeout,
    addEventListener(name,fn){if(!listeners.has(name))listeners.set(name,new Set());listeners.get(name).add(fn);},
    removeEventListener(name,fn){listeners.get(name)?.delete(fn);},
  };
  const server=await createServer({configFile:false,envFile:false,ssr:{noExternal:['react']},server:{middlewareMode:true,hmr:false},appType:'custom',logLevel:'error',plugins:[{
    name:'feed-hooks',enforce:'pre',resolveId(id){if(id==='react')return '\0feed-hooks';},
    load(id){if(id==='\0feed-hooks')return 'export const {useState,useRef,useEffect,useCallback}=globalThis.__feedRecoveryHooks;';},
  }]});
  t.after(async()=>{slots.forEach(slot=>slot?.cleanup?.());Object.assign(globalThis,original);delete globalThis.__feedRecoveryHooks;await server.close();});
  const {useAnimalFeed:renderFeed}=await server.ssrLoadModule('/app/components/useAnimalFeed.ts');
  const empty={items:[],total:0,nextCursor:null,syncedAt:null,stale:false};
  const settle=async()=>{for(let step=0;step<15;step++){if(dirty){dirty=false;index=0;result=renderFeed(empty);effects.splice(0).forEach(effect=>effect());}await new Promise(resolve=>setTimeout(resolve,0));}};
  let resolveIp,failFirst=true,failMore=true,firstRequests=0,moreRequests=0,holdMore=false,resolveMore;
  globalThis.fetch=async input=>{
    const url=new URL(input,'http://localhost');
    if(url.pathname==='/api/location/default')return new Promise(resolve=>{resolveIp=resolve;});
    assert.equal(url.pathname,'/api/animals');
    if(url.searchParams.has('cursor')){moreRequests++;if(holdMore)return new Promise(resolve=>{resolveMore=resolve;});return failMore?Response.json({error:'next failed'},{status:503}):Response.json({items:[{id:'second'}],total:3,nextCursor:'third'});}
    firstRequests++;
    return failFirst?Response.json({error:'first failed'},{status:503}):Response.json({items:[{id:url.searchParams.get('species')==='cat'?'cat':'first'}],total:3,nextCursor:'next'});
  };
  await settle();assert.ok(resolveIp);
  const manual={lat:37.5,lng:127,label:'선택한 동네',source:'manual'};
  store.setItem('ff-home-location',JSON.stringify(manual));
  listeners.get('ff-region-change').forEach(fn=>fn({detail:manual}));await settle();
  resolveIp(Response.json({location:{lat:35,lng:129,label:'늦은 IP 위치',source:'ip'}}));await settle();
  assert.equal(result.location.label,manual.label);assert.deepEqual(JSON.parse(store.getItem('ff-home-location')),manual);
  assert.equal(result.error,'first failed');assert.equal(result.cursor,null);
  failFirst=false;result.retry();await settle();assert.equal(firstRequests,2);assert.equal(result.items[0].id,'first');
  const firstMore=result.loadMore(),duplicate=result.loadMore();await Promise.all([firstMore,duplicate]);await settle();
  assert.equal(moreRequests,1);assert.equal(result.error,'next failed');assert.equal(result.items.length,1);
  failMore=false;result.retry();await settle();assert.equal(moreRequests,2);assert.equal(firstRequests,2);assert.equal(result.items.length,2);
  holdMore=true;const oldPage=result.loadMore();await settle();assert.ok(resolveMore);
  result.setFilter('species','cat');await settle();assert.equal(result.items[0].id,'cat');
  resolveMore(Response.json({items:[{id:'old-filter'}],total:9,nextCursor:null}));await oldPage;await settle();
  assert.deepEqual(result.items.map(item=>item.id),['cat']);
});
