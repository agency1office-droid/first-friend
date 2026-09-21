import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {runInNewContext} from 'node:vm';
import ts from 'typescript';

test('medals preserve the 80% pass threshold and reserve gold for full marks', async()=>{
  const source=await readFile(new URL('../app/components/CertificateCard.tsx',import.meta.url),'utf8');
  const exports={};
  runInNewContext(ts.transpileModule(source,{compilerOptions:{module:ts.ModuleKind.CommonJS,jsx:ts.JsxEmit.ReactJSX}}).outputText,{exports,require:()=>({})});
  for(const total of [15,17]){
    for(let correct=0;correct<=total;correct++){
      assert.equal(exports.medalTone(correct/total),correct===total?'gold':correct>=Math.ceil(total*0.8)?'silver':'bronze');
    }
  }
  assert.equal(exports.medalTone(0),'bronze');
  assert.equal(exports.medalTone(0.8),'silver');
  assert.equal(exports.medalTone(1),'gold');
});

test('certificate tilt calibrates, rotates with the screen and caps movement', async()=>{
  const source=await readFile(new URL('../app/components/CertificateCard.tsx',import.meta.url),'utf8');
  const exports={};
  runInNewContext(ts.transpileModule(source,{compilerOptions:{module:ts.ModuleKind.CommonJS,jsx:ts.JsxEmit.ReactJSX}}).outputText,{exports,require:()=>({})});
  const position=(...args)=>Array.from(exports.tiltPosition(...args));
  assert.deepEqual(position(60,10,[60,10],0),[50,50]);
  assert.deepEqual(position(70,15,[60,10],0),[60,70]);
  assert.deepEqual(position(70,15,[60,10],90),[70,40]);
  assert.deepEqual(position(160,-80,[60,10],0),[0,100]);
  assert.deepEqual(position(-179,0,[179,0],0),[50,54]);
});
