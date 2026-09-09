import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {runInNewContext} from 'node:vm';
import ts from 'typescript';

test('favorite filters intersect, reset and preserve removal behavior', async () => {
  const source=await readFile(new URL('../app/components/FavoriteAnimalGrid.tsx',import.meta.url),'utf8');
  const states=[];let cursor=0;const exports={};
  const jsx=(type,props)=>({type,props});
  runInNewContext(ts.transpileModule(source,{compilerOptions:{module:ts.ModuleKind.CommonJS,jsx:ts.JsxEmit.ReactJSX}}).outputText,{exports,require:id=>{
    if(id==='react')return {useState:v=>{const i=cursor++;if(!(i in states))states[i]=v;return [states[i],v=>states[i]=typeof v==='function'?v(states[i]):v];}};
    if(id==='react/jsx-runtime')return {jsx,jsxs:jsx,Fragment:'fragment'};
    if(id.includes('animal-public-status'))return {getAnimalPublicStatus:a=>({phase:a.phase})};
    if(id.includes('AnimalCard'))return {AnimalCard:'card'};
    return {Chip:{Button:'button',Label:'label'}};
  }});
  const animals=[{id:'dog',species:'강아지',phase:'notice'},{id:'cat',species:'고양이',phase:'protected'},{id:'other',species:'토끼',phase:'unknown'}];
  const render=()=>{cursor=0;return exports.FavoriteAnimalGrid({animals});};
  const nodes=n=>!n||typeof n!=='object'?[]:[n,...[n.props?.children].flat(2).flatMap(nodes)];
  const cards=()=>nodes(render()).filter(n=>n.type==='card');
  const click=(group,label)=>nodes(render()).filter(n=>n.props?.['aria-label']===group).flatMap(nodes).find(n=>n.type==='button'&&n.props.children.props.children===label).props.onClick();
  assert.equal(cards().length,3);
  click('동물 종류','고양이');assert.equal(cards()[0].props.animal.id,'cat');
  click('보호 상태','보호자 확인 공고 중');assert.equal(cards().length,0);
  nodes(render()).find(n=>n.type==='button'&&n.props.children.props.children==='필터 초기화').props.onClick();
  assert.equal(cards().length,3);
  click('동물 종류','기타 동물');assert.equal(cards()[0].props.animal.id,'other');
  cards()[0].props.onFavoriteChange(false);assert.equal(cards().length,0);
  assert.equal(states[0].length,2);
});
