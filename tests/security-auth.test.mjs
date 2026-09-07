import assert from "node:assert/strict";
import test from "node:test";
import { createServer } from "vite";

test("authentication and upload trust boundaries", async t => {
  const server = await createServer({ configFile: false, envFile: false, optimizeDeps: { noDiscovery: true, include: [] }, server: { middlewareMode: true, hmr: false }, appType: "custom", logLevel: "error", plugins: [{
    name: "test-session", enforce: "pre",
    resolveId(id) { if (id.endsWith("chatgpt-auth")) return "\0test-session"; },
    load(id) { if (id === "\0test-session") return 'export async function getChatGPTUser(){return {userId:"test-member"};}'; },
  }] });
  t.after(() => server.close());
  for (const [key,value] of Object.entries({ NEXT_PUBLIC_SUPABASE_URL: "https://security.example.test", SUPABASE_SECRET_KEY: "test-only" })) {
    const previous=process.env[key]; process.env[key]=value;
    t.after(()=>{if(previous===undefined)delete process.env[key];else process.env[key]=previous;});
  }
  const auth=await server.ssrLoadModule("/lib/app-auth.ts");
  const guards=await server.ssrLoadModule("/lib/api-guards.ts");
  const login=await server.ssrLoadModule("/app/api/auth/login/route.ts");
  const register=await server.ssrLoadModule("/app/api/auth/register/route.ts");
  const uploads=await server.ssrLoadModule("/app/api/uploads/route.ts");
  const appeal=await server.ssrLoadModule("/app/api/appeal-evidence/route.ts");
  const media=await server.ssrLoadModule("/app/api/media/route.ts");
  const password=await auth.hashPassword("test-password");
  let rateFailure=false, sanctioned=false, sessions=0, storageWrites=0, deleteFailure=false, mediaRedirect=false;
  const keys=[];
  t.mock.method(globalThis,"fetch",async(input,options={})=>{
    const url=new URL(typeof input==="string"||input instanceof URL?input:input.url);
    if(url.hostname==="openapi.animal.go.kr"){
      assert.equal(options.redirect,"error");
      if(mediaRedirect)throw new TypeError("redirect refused");
      return new Response(new Uint8Array([255,216,255]),{headers:{"content-type":"image/jpeg"}});
    }
    assert.equal(url.hostname,"security.example.test");
    if(url.pathname.includes("/storage/")){storageWrites++;return Response.json({Key:"test"});}
    const table=url.pathname.split("/").at(-1), method=options.method||"GET";
    if(table==="consume_api_rate_limit")return rateFailure?Response.json({message:"unavailable"},{status:500}):Response.json(true);
    if(table==="auth_accounts")return Response.json([{member_id:"test-member",password_hash:password.hash,password_salt:password.salt}]);
    if(table==="members")return Response.json({id:"test-member",sanctioned});
    if(table==="auth_sessions"){sessions++;return new Response(null,{status:201});}
    if(table==="api_idempotency_keys"){
      if(method==="POST"){
        const row=JSON.parse(options.body);
        if(keys.some(k=>k.idempotency_key===row.idempotency_key))return Response.json({code:"23505"},{status:409});
        keys.push(row);return Response.json(row);
      }
      const row=keys.find(k=>url.searchParams.get("idempotency_key")==="eq."+k.idempotency_key);
      if(method==="DELETE"){
        if(deleteFailure)return Response.json({message:"delete unavailable"},{status:500});
        keys.splice(keys.indexOf(row),1);return new Response(null,{status:204});
      }
      if(method==="PATCH"){Object.assign(row,JSON.parse(options.body));return new Response(null,{status:204});}
      return Response.json(row);
    }
    assert.fail("unexpected table "+table);
  });
  const json=(path,body,origin="https://www.firstfriend.me")=>new Request("https://www.firstfriend.me"+path,{method:"POST",headers:{"content-type":"application/json",origin},body:JSON.stringify(body)});
  await t.test("cross-origin login and registration cannot create sessions",async()=>{
    for(const route of [login,register])assert.equal((await route.POST(json("/api/auth/login",{email:"test@example.test",password:"test-password"},"https://evil.example"))).status,403);
    assert.equal(sessions,0);
  });
  await t.test("malformed and oversized authentication payloads fail cleanly",async()=>{
    for(const route of [login,register]){
      for(const body of [null,[],{email:"a",password:"x".repeat(1025)}])assert.equal((await route.POST(json("/api/auth/login",body))).status,400);
      assert.equal((await route.POST(new Request("https://www.firstfriend.me/api/auth/login",{method:"POST",body:"{"}))).status,400);
    }
  });
  await t.test("rate storage failures block rather than permit protected requests",async()=>{
    rateFailure=true;
    assert.equal(await guards.enforceRateLimit("test","member",60,2),false);
    assert.equal((await login.POST(json("/api/auth/login",{email:"test@example.test",password:"test-password"}))).status,429);
    assert.equal(sessions,0);rateFailure=false;
  });
  await t.test("sanctioned password login does not issue a session",async()=>{
    sanctioned=true;
    assert.equal((await login.POST(json("/api/auth/login",{email:"test@example.test",password:"test-password"}))).status,403);
    assert.equal(sessions,0);sanctioned=false;
    const result=await login.POST(json("/api/auth/login",{email:"test@example.test",password:"test-password"}));
    assert.equal(result.status,200);assert.equal(sessions,1);
    assert.match(result.headers.get("set-cookie"),/HttpOnly; Secure; SameSite=Lax/);
  });
  function uploadRequest(purpose,key,tail=0){
    const data=new Uint8Array(80);data.set([137,80,78,71,13,10,26,10]);data[79]=tail;
    const form=new FormData();form.set("file",new File([data],"proof.png",{type:"image/png"}));form.set("purpose",purpose);
    return new Request("https://www.firstfriend.me/api/uploads",{method:"POST",headers:{"idempotency-key":key},body:form});
  }
  await t.test("upload idempotency covers full content and private purpose",async()=>{
    const first=await uploads.POST(uploadRequest("public-media","test-upload"));
    assert.equal(first.status,201);const writes=storageWrites;
    assert.equal((await uploads.POST(uploadRequest("public-media","test-upload",1))).status,409);
    assert.equal((await uploads.POST(uploadRequest("role-verification","test-upload"))).status,409);
    assert.equal(storageWrites,writes);
    assert.equal((await uploads.POST(uploadRequest("drawing-board","test-drawing"))).status,201);
  });
  await t.test("appeal evidence uses the reviewable private prefix",async()=>{
    const result=await appeal.POST(uploadRequest("public-media","appeal-test"));
    assert.equal(result.status,201);assert.match((await result.json()).key,/^appeal-evidence\/test-member\//);
  });
  await t.test("expired idempotency cleanup failure throws once without recursion",async()=>{
    keys.push({idempotency_key:"expired-test",expires_at:"2000-01-01",status:"processing"});
    deleteFailure=true;
    await assert.rejects(guards.beginIdempotentRequest("test","test",new Request("https://www.firstfriend.me",{headers:{"idempotency-key":"expired-test"}}),"body"));
    deleteFailure=false;
  });
  await t.test("media proxy refuses nonpublic targets and follows no redirects",async()=>{
    for(const source of ["http://openapi.animal.go.kr/a.jpg","https://127.0.0.1/a.jpg","https://openapi.animal.go.kr:8443/a.jpg","https://user:pass@openapi.animal.go.kr/a.jpg"]){
      assert.equal((await media.GET(new Request("https://www.firstfriend.me/api/media?url="+encodeURIComponent(source)))).status,403);
    }
    const req=()=>new Request("https://www.firstfriend.me/api/media?url="+encodeURIComponent("https://openapi.animal.go.kr/a.jpg"));
    assert.equal((await media.GET(req())).status,200);
    mediaRedirect=true;assert.equal((await media.GET(req())).status,504);
  });
});
