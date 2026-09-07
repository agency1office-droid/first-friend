import test from 'node:test';
import assert from 'node:assert/strict';
import {createServer} from 'vite';

test('sync history is admin-only, paginated, and image runs preserve partial and fatal failures',async t=>{
 const server=await createServer({configFile:false,envFile:false,optimizeDeps:{noDiscovery:true,include:[]},appType:'custom',logLevel:'error',server:{middlewareMode:true,hmr:false},plugins:[{name:'sync-auth',enforce:'pre',resolveId(s){if(s.endsWith('chatgpt-auth'))return '\0sync-auth';},load(id){if(id==='\0sync-auth')return 'export async function getAuthenticatedMember(){return globalThis.__syncMember}';}}]});
 const oldFetch=globalThis.fetch,oldUrl=process.env.NEXT_PUBLIC_SUPABASE_URL,oldKey=process.env.SUPABASE_SECRET_KEY;
 process.env.NEXT_PUBLIC_SUPABASE_URL='https://sync.example.test';process.env.SUPABASE_SECRET_KEY='test-only';
 t.after(async()=>{globalThis.fetch=oldFetch;delete globalThis.__syncMember;if(oldUrl===undefined)delete process.env.NEXT_PUBLIC_SUPABASE_URL;else process.env.NEXT_PUBLIC_SUPABASE_URL=oldUrl;if(oldKey===undefined)delete process.env.SUPABASE_SECRET_KEY;else process.env.SUPABASE_SECRET_KEY=oldKey;await server.close();});
 let calls=[],mode='empty',claimed=false,updates=[];
 globalThis.fetch=async(input,options={})=>{
   const url=new URL(input);calls.push(url);
   if(url.pathname.endsWith('/claim_animal_thumbnails')){
     if(mode==='fatal')return Response.json({message:'queue unavailable'},{status:503});
     if(mode==='partial'&&!claimed){claimed=true;return Response.json([{id:7,animal_id:'test-animal',slot:1,source_url:'https://evil.example.test/photo',updated_at:'2026-09-08',attempt_count:1}]);}
     return Response.json([]);
   }
   if(options.method==='PATCH'){updates.push({table:url.pathname.split('/').at(-1),body:JSON.parse(options.body)});return new Response(null,{status:204});}
   if(options.method==='POST'&&!url.pathname.includes('/rpc/'))return new Response(null,{status:201});
   return Response.json([],{headers:{'content-range':'0-0/21'}});
 };
 const {GET}=await server.ssrLoadModule('/app/api/operations/route.ts');
 const req=new Request('https://www.firstfriend.me/api/operations?view=sync&page=2&kind=animal-thumbnails&status=failed');
 assert.equal((await GET(req)).status,401);
 globalThis.__syncMember={id:'shelter',role:'shelter',verified:true};assert.equal((await GET(req)).status,403);assert.equal(calls.length,0);
 globalThis.__syncMember={id:'admin',role:'admin',verified:true};const response=await GET(req);assert.equal(response.status,200);assert.equal(response.headers.get('cache-control'),'no-store');
 assert.ok(calls.some(u=>u.pathname.endsWith('/sync_runs')&&u.searchParams.get('offset')==='20'&&u.searchParams.get('kind')==='eq.animal-thumbnails'&&u.searchParams.get('status')==='eq.failed'));
 const {processAnimalThumbnails}=await server.ssrLoadModule('/lib/animal-thumbnails.ts');
 await processAnimalThumbnails({maxJobs:1});assert.equal(updates.at(-1).body.status,'completed');
 mode='partial';await processAnimalThumbnails({maxJobs:1});assert.equal(updates.at(-1).body.status,'partial');assert.equal(updates.at(-1).body.image_failed,1);assert.match(updates.at(-1).body.message,/test-animal/);
 mode='fatal';await assert.rejects(()=>processAnimalThumbnails({maxJobs:1}));assert.equal(updates.at(-1).body.status,'failed');
});
