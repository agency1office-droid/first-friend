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
