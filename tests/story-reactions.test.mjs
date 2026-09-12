import assert from "node:assert/strict";
import {readFile} from "node:fs/promises";
import test from "node:test";
import {createServer} from "vite";

test("story reactions validate input, save through the RPC and notify authors once per post", async t=>{
 const posts={1:{author:"author"},2:{author:"me"}},saved=new Map(),notifications=[];
 let actor="me",rpcError=null;
 globalThis.__reactionFixture={
  user:()=>actor?{userId:actor,displayName:"반응 회원"}:null,
  client:{
   rpc:async(name,{p_member,p_post,p_reaction})=>{
    if(name==="consume_api_rate_limit")return {data:true,error:null};
    assert.equal(name,"set_story_reaction");if(rpcError)return {data:null,error:rpcError};
    const key=p_member+":"+p_post,previous=saved.get(key)??null;if(p_reaction)saved.set(key,p_reaction);else saved.delete(key);
    const counts={};for(const [k,v] of saved)if(k.endsWith(":"+p_post))counts[v]=(counts[v]||0)+1;
    return {data:{reaction:p_reaction,previous,author:posts[p_post].author,counts,count:Object.values(counts).reduce((a,b)=>a+b,0)},error:null};
   },
   from:table=>({insert:async row=>{assert.equal(table,"notifications");notifications.push(row);return {error:null};}}),
  },
 };
 const server=await createServer({configFile:false,envFile:false,appType:"custom",logLevel:"error",optimizeDeps:{noDiscovery:true,include:[]},server:{middlewareMode:true,hmr:false},plugins:[{name:"reaction-fixture",enforce:"pre",resolveId(s){if(s.endsWith("chatgpt-auth"))return "\0reaction-auth";if(s.endsWith("supabase/server"))return "\0reaction-db";},load(id){if(id==="\0reaction-auth")return "export async function getChatGPTUser(){return globalThis.__reactionFixture.user()}";if(id==="\0reaction-db")return "export function getSupabaseServerClient(){return globalThis.__reactionFixture.client}";}}]});
 t.after(async()=>{await server.close();delete globalThis.__reactionFixture;});
 const api=await server.ssrLoadModule("/app/api/reactions/route.ts");
 const send=(body,origin="https://board.test")=>api.POST(new Request("https://board.test/api/reactions",{method:"POST",headers:{"content-type":"application/json",origin},body:JSON.stringify(body)}));
 actor=null;assert.equal((await send({postId:1,reaction:"cheer"})).status,401);
 actor="me";assert.equal((await send({postId:1,reaction:"cheer"},"https://evil.test")).status,403);
 assert.equal((await send({postId:1,reaction:"angry"})).status,400,"only the five known reactions are accepted");
 assert.equal((await send({postId:0,reaction:"cheer"})).status,400);
 let r=await send({postId:1,reaction:"cheer"});assert.equal(r.status,200);let body=await r.json();
 assert.equal(body.reaction,"cheer");assert.deepEqual(body.counts,{cheer:1,touched:0,cute:0,thanks:0,sad:0});assert.equal(body.count,1);
 assert.equal(notifications.length,1);assert.equal(notifications[0].member_id,"author");assert.equal(notifications[0].type,"story_reaction");assert.equal(notifications[0].href,"/stories/post-1");assert.match(notifications[0].body,/반응 회원님이 '응원해요'/);
 r=await send({postId:1,reaction:"cute"});body=await r.json();assert.equal(body.reaction,"cute");assert.equal(body.counts.cheer,0);assert.equal(body.counts.cute,1);
 assert.equal(notifications.length,1,"changing a reaction does not notify again");
 r=await send({postId:1,reaction:null});body=await r.json();assert.equal(body.reaction,null);assert.equal(body.count,0);assert.equal(notifications.length,1);
 assert.equal((await send({postId:2,reaction:"cheer"})).status,200);assert.equal(notifications.length,1,"authors are not notified about their own reaction");
 rpcError={message:"story unavailable"};assert.equal((await send({postId:1,reaction:"cheer"})).status,409);
});

test("story screens open the sign-in sheet in place and expose admin moderation only to admins", async()=>{
 const read=path=>readFile(new URL("../"+path,import.meta.url),"utf8");
 const [actions,detail,admin,create,manage,sheet,feed,list]=await Promise.all(["app/components/StoryActions.tsx","app/stories/[id]/page.tsx","app/components/StoryAdminActions.tsx","app/stories/new/page.tsx","app/stories/manage/page.tsx","app/components/LoginSheet.tsx","app/components/StoryFeed.tsx","app/stories/page.tsx"].map(read));
 assert.match(feed,/new IntersectionObserver/);assert.match(feed,/params\.set\("page",String\(page\+1\)\)/);assert.match(feed,/seen\.has\(s\.id\)/,"appended pages skip stories already shown");
 assert.doesNotMatch(list,/ff-board-pagination/,"the story list scrolls instead of paging");assert.match(list,/<StoryFeed key=\{params\.toString\(\)\}/);
 assert.match(sheet,/export function LoginBottomSheet/);
 assert.match(actions,/LoginBottomSheet/);assert.doesNotMatch(actions,/location\.href="\/login/,"guests stay on the story instead of leaving for /login");
 assert.match(actions,/if\(!signedIn\)\{askLogin\(\);return;\}/);
 assert.match(detail,/getAuthenticatedMember/);assert.match(detail,/member\?\.role==="admin"&&<StoryAdminActions/);assert.match(detail,/signedIn=\{Boolean\(member\)\}/);
 assert.match(admin,/"post-visibility"/);assert.match(admin,/"post-delete"/);assert.match(admin,/"idempotency-key"/);assert.match(admin,/note\.trim\(\)\.length<2/);
 for(const source of [create,manage]){assert.match(source,/<LoginSheet returnTo="\/stories\//);assert.doesNotMatch(source,/requireChatGPTUser/);}
});
