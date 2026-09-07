import test from 'node:test';
import assert from 'node:assert/strict';
import {createServer} from 'vite';

test('admin entry requires login, retains destination, and reuses the protected console',async t=>{
  const server=await createServer({configFile:false,envFile:false,appType:'custom',logLevel:'error',server:{middlewareMode:true,hmr:false},plugins:[{
    name:'admin-entry-fixture',enforce:'pre',
    resolveId(s){if(s.endsWith('chatgpt-auth'))return '\0entry-auth';if(s==='next/navigation')return '\0entry-navigation';},
    load(id){if(id==='\0entry-auth')return 'export async function requireChatGPTUser(path){globalThis.__adminReturn=path;if(!globalThis.__adminSignedIn)throw new Error("LOGIN:"+path);return {userId:"fixture"};}';if(id==='\0entry-navigation')return 'export function redirect(path){throw new Error("REDIRECT:"+path)}';},
  }]});
  t.after(async()=>{await server.close();delete globalThis.__adminReturn;delete globalThis.__adminSignedIn;});
  const {default:page}=await server.ssrLoadModule('/app/admin/page.tsx');
  await assert.rejects(()=>page({searchParams:Promise.resolve({})}),{message:'LOGIN:/admin'});
  await assert.rejects(()=>page({searchParams:Promise.resolve({view:'sync',page:'2'})}),{message:'LOGIN:/admin?view=sync&page=2'});
  globalThis.__adminSignedIn=true;
  await assert.rejects(()=>page({searchParams:Promise.resolve({view:'sync'})}),{message:'REDIRECT:/operations?view=sync'});
  assert.equal(globalThis.__adminReturn,'/admin?view=sync');
});
