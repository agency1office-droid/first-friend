import assert from "node:assert/strict";
import test from "node:test";
import {createServer} from "vite";
import sharp from "sharp";

test("story board preserves privacy, ownership, photo limits and editing revisions", async t=>{
 const db={posts:[],post_media:[],members:[{id:"author",role:"member",display_name:"실제 작성자"},{id:"other",role:"member"}],applications:[],adoption_certifications:[],direct_animals:[]},objects=new Map();
 let actor="author",failure=false;
 globalThis.__storyFixture={
  user:()=>actor?{userId:actor,id:actor,role:"member"}:null,
  client:{
   rpc:async()=>({data:true,error:null}),
   storage:{from:()=>({upload:async(k,v)=>{objects.set(k,v);return {error:null};},download:async k=>({data:new Blob([objects.get(k)],{type:"image/webp"}),error:null}),remove:async keys=>{keys.forEach(k=>objects.delete(k));return {error:null};}})},
   from(table){
    let predicates=[],single=false,change,insert,range,limit;
    const q={select(){return q;},eq(k,v){predicates.push(r=>r[k]===v);return q;},neq(k,v){predicates.push(r=>r[k]!==v);return q;},in(k,v){predicates.push(r=>v.includes(r[k]));return q;},contains(k,v){predicates.push(r=>v.every(x=>r[k]?.includes(x)));return q;},ilike(k,v){predicates.push(r=>r[k]?.includes(v.slice(1,-1)));return q;},order(){return q;},limit(v){limit=v;return q;},range(a,b){range=[a,b];return q;},maybeSingle(){single=true;return q;},single(){single=true;return q;},update(v){change=v;return q;},insert(v){insert=v;return q;},
     then(resolve,reject){if(failure)return Promise.resolve({data:null,error:{message:"offline"}}).then(resolve,reject);
      if(insert)db[table].push({id:db[table].length+1,revision:1,hidden:false,created_at:new Date().toISOString(),...insert});
      let rows=db[table].filter(r=>predicates.every(p=>p(r)));if(change)rows.forEach(r=>Object.assign(r,change));const count=rows.length;if(range)rows=rows.slice(range[0],range[1]+1);if(limit)rows=rows.slice(0,limit);
      rows=rows.map(r=>({...r,members:db.members.find(m=>m.id===r.member_id)}));return Promise.resolve({data:single?rows[0]||null:rows,count,error:null}).then(resolve,reject);
     }
    };return q;
   }
  }
 };
 const server=await createServer({configFile:false,envFile:false,appType:"custom",logLevel:"error",optimizeDeps:{noDiscovery:true,include:[]},server:{middlewareMode:true,hmr:false},plugins:[{name:"story-fixture",enforce:"pre",resolveId(s){if(s.endsWith("chatgpt-auth"))return "\0story-auth";if(s.endsWith("supabase/server"))return "\0story-db";},load(id){if(id==="\0story-auth")return "export async function getChatGPTUser(){return globalThis.__storyFixture.user()} export async function getAuthenticatedMember(){return globalThis.__storyFixture.user()}";if(id==="\0story-db")return "export function getSupabaseServerClient(){return globalThis.__storyFixture.client}";}}]});
 t.after(async()=>{await server.close();delete globalThis.__storyFixture;});
 const api=await server.ssrLoadModule("/app/api/posts/route.ts"),media=await server.ssrLoadModule("/app/api/post-media/route.ts"),stories=await server.ssrLoadModule("/lib/stories.ts");
 const send=(method,body,origin="https://board.test")=>api[method](new Request("https://board.test/api/posts",{method,headers:{"content-type":"application/json",origin},body:JSON.stringify(body)}));
 const payload={clientKey:crypto.randomUUID(),title:"산책한 날",body:"오늘 함께 산책했어요.",category:"memory",status:"draft",imageKeys:[]};
 actor=null;assert.equal((await send("POST",payload)).status,401);assert.equal((await api.GET(new Request("https://board.test/api/posts?mine=1"))).status,401);
 actor="author";assert.equal((await send("POST",payload,"https://evil.test")).status,403);
 let r=await send("POST",payload);assert.equal(r.status,201);const saved=(await r.json()).post;
 assert.equal((await send("POST",payload)).status,200);assert.equal(db.posts.length,1,"retries cannot create duplicates");
 assert.equal((await stories.getStoryPage()).total,0);assert.equal(await stories.getStory("post-"+saved.id),null);assert.equal((await stories.getStoryPage(new URLSearchParams(),"author")).total,1);
 actor="other";assert.equal((await send("PUT",{...payload,id:saved.id,revision:1})).status,404);
 actor="author";
 const file=await sharp({create:{width:1600,height:900,channels:3,background:"#f90"}}).jpeg().withMetadata().toBuffer();
 const form=new FormData();form.set("file",new File([file],"photo.jpg",{type:"image/jpeg"}));
 r=await media.POST(new Request("https://board.test/api/post-media",{method:"POST",body:form}));assert.equal(r.status,201);const key=(await r.json()).key;
 const photoRequest=()=>new Request("https://board.test/api/post-media?id="+key.slice(12));
 r=await media.GET(photoRequest());assert.equal(r.status,200);const meta=await sharp(await r.arrayBuffer()).metadata();assert.equal(meta.width,1200);assert.equal(meta.exif,undefined);assert.equal(meta.format,"webp");
 actor=null;assert.equal((await media.GET(photoRequest())).status,404);actor="other";assert.equal((await media.GET(photoRequest())).status,404);
 assert.equal((await send("POST",{...payload,clientKey:crypto.randomUUID(),imageKeys:[key]})).status,403);
 actor="author";assert.equal((await send("PUT",{...payload,id:saved.id,revision:1,imageKeys:[key,key,key,key]})).status,400);
 assert.equal((await send("PUT",{...payload,id:saved.id,revision:1,category:"adoption",status:"published"})).status,403);
 r=await send("PUT",{...payload,id:saved.id,revision:1,status:"published",imageKeys:[key]});assert.equal(r.status,200);
 assert.equal((await stories.getStory("post-"+saved.id)).author,"실제 작성자");
 assert.equal((await send("PUT",{...payload,id:saved.id,revision:1})).status,409,"stale edits cannot overwrite newer content");
 actor=null;assert.equal((await media.GET(photoRequest())).status,200);
 db.posts[0].hidden=true;assert.equal((await media.GET(photoRequest())).status,404);assert.equal(await stories.getStory("post-"+saved.id),null);db.posts[0].hidden=false;
 actor="other";assert.equal((await api.DELETE(new Request("https://board.test/api/posts?id="+saved.id+"&revision=2",{method:"DELETE"}))).status,409);
 actor="author";assert.equal((await api.DELETE(new Request("https://board.test/api/posts?id="+saved.id+"&revision=2",{method:"DELETE"}))).status,200);
 assert.equal((await stories.getStoryPage(new URLSearchParams(),"author")).total,0);
 actor=null;assert.equal((await media.GET(photoRequest())).status,404);
 failure=true;assert.equal((await api.GET(new Request("https://board.test/api/posts"))).status,503);
});
