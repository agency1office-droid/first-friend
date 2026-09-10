import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {runInNewContext} from 'node:vm';
import ts from 'typescript';

test('detail back returns to the originating history entry, with safe direct-entry fallback',async()=>{
  const source=await readFile(new URL('../app/components/AppChrome.tsx',import.meta.url),'utf8');
  for(const previous of ['/?species=dog','/mypage/favorites',null]){
    const current='/friends/123';let stack=previous?[previous,current]:[current],back=0,push;
    const exports={};
    runInNewContext(ts.transpileModule(source,{compilerOptions:{module:ts.ModuleKind.CommonJS,jsx:ts.JsxEmit.ReactJSX}}).outputText,{
      exports,URL,document:{referrer:''},window:{location:new URL('https://www.firstfriend.me'+current),history:{length:previous?2:1,back(){back++;}},sessionStorage:{getItem:()=>JSON.stringify(stack),setItem:(_k,v)=>{stack=JSON.parse(v);}}},
      require:id=>id==='react/jsx-runtime'?{jsx:(type,props)=>({type,props})}:id==='next/navigation'?{useRouter:()=>({push:v=>{push=v;}})}:{},
    });
    exports.AppBackButton({fallback:'/',title:'친구 정보'}).props.onClick();
    assert.equal(back,previous?1:0);assert.equal(push,previous?undefined:'/');
    if(previous)assert.equal(stack.at(-1),previous);
  }
});
