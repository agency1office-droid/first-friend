import test from 'node:test';
import assert from 'node:assert/strict';
import {createServer} from 'vite';

test('async forms retain their form element after React clears currentTarget',async t=>{
  const original={fetch:globalThis.fetch,FormData:globalThis.FormData};
  globalThis.FormData=class { entries(){return [['title','test']][Symbol.iterator]();} get(){return 'test';} };
  const server=await createServer({configFile:false,envFile:false,ssr:{noExternal:['react']},optimizeDeps:{noDiscovery:true,include:[]},server:{middlewareMode:true,hmr:false},appType:'custom',logLevel:'error',plugins:[{name:'form-fixture',enforce:'pre',resolveId(s){if(s==='react')return '\0form-react';if(s.startsWith('react/jsx'))return '\0form-jsx';if(s.startsWith('seed-design/ui/'))return '\0form-ui';if(s.endsWith('AppFeedback'))return '\0form-feedback';},load(id){
    if(id==='\0form-react')return 'export const useState=v=>[v,()=>{}],useEffect=()=>{},useCallback=f=>f;';
    if(id==='\0form-jsx')return 'export const jsxDEV=(type,props)=>({type,props});export const jsx=jsxDEV,jsxs=jsxDEV;';
    if(id==='\0form-ui')return 'export const ActionButton="button",TextField="div",TextFieldInput="input",TextFieldTextarea="textarea",Callout="aside";';
    if(id==='\0form-feedback')return 'export const useAppFeedback=()=>({success(){},error(){}});';
  }}]});
  t.after(async()=>{await server.close();Object.assign(globalThis,original);});
  const findForm=node=>{if(!node||typeof node!=='object')return; if(node.type==='form')return node;return [node.props?.children].flat(Infinity).map(findForm).find(Boolean);};
  for(const name of ['ShelterFundraiserForm','NameSuggestionBox']){
    const component=await server.ssrLoadModule('/app/components/'+name+'.tsx');
    const form=findForm(component[name]({animalId:'test',currentName:'test'}));assert.ok(form);
    let resets=0;const event={preventDefault(){},currentTarget:{reset(){resets++;}}};
    globalThis.fetch=async()=>{event.currentTarget=null;return Response.json({});};
    await form.props.onSubmit(event);assert.equal(resets,1,name+' completed form reset');
  }
});

test('favorite mutation recovers after network failure and does not mistake one known favorite for the entire list',async t=>{
  const states=[],refs=[],effects=[];let cursor=0,refCursor=0;const messages=[];
  globalThis.__siteHooks={useState(value){const i=cursor++;if(!(i in states))states[i]=value;return [states[i],v=>{states[i]=typeof v==='function'?v(states[i]):v;}];},useRef(value){const i=refCursor++;return refs[i] ||= {current:value};},useEffect(fn){effects.push(fn);}};
  globalThis.__siteFeedback={error:message=>messages.push(message),success(){}};
  const originals={fetch:globalThis.fetch,window:globalThis.window,document:globalThis.document,sessionStorage:globalThis.sessionStorage};
  globalThis.window={addEventListener(){},removeEventListener(){},dispatchEvent(){}};
  t.after(()=>{Object.assign(globalThis,originals);delete globalThis.__siteHooks;delete globalThis.__siteFeedback;});
  const server=await createServer({configFile:false,envFile:false,ssr:{noExternal:['react','lucide-react']},optimizeDeps: { noDiscovery: true, include: [] }, server: { middlewareMode: true, hmr: false },appType:'custom',logLevel:'error',plugins:[{name:'site-hooks',enforce:'pre',resolveId(source){if(source==='react')return '\0site-react';if(source.startsWith('react/jsx'))return '\0site-jsx';if(source.endsWith('/AppFeedback')||source==='./AppFeedback')return '\0site-feedback';if(source==='lucide-react')return '\0site-icons';},load(id){if(id==='\0site-jsx')return 'export const jsxDEV=(type,props)=>({type,props}); export const jsx=jsxDEV,jsxs=jsxDEV;';if(id==='\0site-react')return 'export const {useState,useRef,useEffect}=globalThis.__siteHooks;';if(id==='\0site-feedback')return 'export function useAppFeedback(){return globalThis.__siteFeedback;}';if(id==='\0site-icons')return 'export const Bookmark="svg";';}}]});
  t.after(()=>server.close());
  const {FavoriteButton}=await server.ssrLoadModule('/app/components/FavoriteButton.tsx');
  const render=props=>{cursor=0;refCursor=0;return FavoriteButton(props);};
  let gets=0;globalThis.fetch=async()=>{gets++;return Response.json({favorites:[{animalId:'other'}]});};
  render({animalId:'known',animalName:'known',initialSaved:true});effects.splice(0).forEach(fn=>fn());
  states.length=0;refs.length=0;
  render({animalId:'other',animalName:'other'});effects.splice(0).forEach(fn=>fn());
  await new Promise(resolve=>setTimeout(resolve,0));
  let button=render({animalId:'other',animalName:'other'});
  assert.equal(gets,1,'initialSaved must not populate an incomplete global list');assert.equal(button.props['aria-pressed'],true);
  let mutations=0;globalThis.fetch=async()=>{mutations++;throw new Error('offline');};
  await button.props.onClick();
  button=render({animalId:'other',animalName:'other'});
  assert.equal(button.props['aria-disabled'],false,'network failure unlocks retry');assert.equal(messages.length,1);
  assert.equal(button.props['aria-pressed'],true,'failed delete restores the saved icon');
  await button.props.onClick();assert.equal(mutations,2,'retry is possible');
  let finish;globalThis.fetch=()=>{mutations++;return new Promise(resolve=>{finish=resolve;});};
  const write=button.props.onClick();
  let pending=render({animalId:'other',animalName:'other'});
  assert.equal(pending.props['aria-pressed'],false,'icon changes before the network response');
  assert.equal(pending.props.disabled,undefined,'pending state does not apply gray disabled CSS');
  await pending.props.onClick();assert.equal(mutations,3,'duplicate clicks do not create another write');
  finish(Response.json({saved:false}));await write;
  const storage=new Map([['ff-favorites-display-v1',JSON.stringify({scope:'account-a',ids:['cached']})]]);
  globalThis.sessionStorage={getItem:k=>storage.get(k)||null,setItem:(k,v)=>storage.set(k,v),removeItem:k=>storage.delete(k)};
  globalThis.document={body:{dataset:{favoriteScope:'account-a'}}};
  const reads=[];globalThis.fetch=()=>new Promise(resolve=>reads.push(resolve));
  states.length=0;refs.length=0;effects.length=0;
  render({animalId:'cached',animalName:'cached'});const cleanup=effects.splice(0).map(fn=>fn());
  await new Promise(resolve=>setTimeout(resolve,0));
  assert.equal(render({animalId:'cached',animalName:'cached'}).props['aria-pressed'],true,'full navigation restores cached icon before the GET resolves');
  cleanup.forEach(fn=>fn?.());
  globalThis.document.body.dataset.favoriteScope='account-b';states.length=0;refs.length=0;effects.length=0;
  render({animalId:'cached',animalName:'cached'});effects.splice(0).forEach(fn=>fn());await new Promise(resolve=>setTimeout(resolve,0));
  button=render({animalId:'cached',animalName:'cached'});
  assert.equal(button.props['aria-pressed'],false,'another login cannot reuse the previous account cache');
  globalThis.fetch=async()=>Response.json({saved:true});await button.props.onClick();
  reads[0](Response.json({favorites:[{animalId:'cached'}]}));reads[1](Response.json({favorites:[]}));await new Promise(resolve=>setTimeout(resolve,0));
  assert.equal(render({animalId:'cached',animalName:'cached'}).props['aria-pressed'],true,'late GET cannot undo a confirmed POST');
  assert.deepEqual(JSON.parse(storage.get('ff-favorites-display-v1')),{scope:'account-b',ids:['cached']});
});
