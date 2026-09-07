import assert from "node:assert/strict";
import test from "node:test";
import { createServer } from "vite";

test("operations permissions, real pagination and guarded approval", async t => {
  const server = await createServer({ configFile: false, envFile: false, optimizeDeps: { noDiscovery: true, include: [] }, server: { middlewareMode: true, hmr: false }, appType: "custom", logLevel: "error", plugins: [{
    name: "test-auth", enforce: "pre",
    resolveId(source) { if (source.endsWith("chatgpt-auth")) return "\0test-auth"; },
    load(id) { if (id === "\0test-auth") return "export async function getChatGPTUser(){return globalThis.__operationsUser;}"; },
  }] });
  t.after(() => server.close());
  for (const [name, value] of Object.entries({ NEXT_PUBLIC_SUPABASE_URL: "https://operations.example.test", SUPABASE_SECRET_KEY: "test-only" })) {
    const old = process.env[name]; process.env[name] = value;
    t.after(() => { if (old === undefined) delete process.env[name]; else process.env[name] = old; });
  }
  t.after(() => delete globalThis.__operationsUser);
  const { GET, POST } = await server.ssrLoadModule("/app/api/operations/route.ts");
  const { POST: manage } = await server.ssrLoadModule("/app/api/operations/manage/route.ts");
  const { POST: outreach } = await server.ssrLoadModule("/app/api/operations/outreach/route.ts");
  const { GET: evidence } = await server.ssrLoadModule("/app/api/operations/evidence/route.ts");
  const { parseOperationQuery } = await server.ssrLoadModule("/lib/operations.ts");
  let role = "admin", verified = true, sanctioned = false, failAudit = false;
  const requests = [];
  const db = {
    members: [], auth_accounts: [], contact_preferences: [],
    auth_sessions: [{ member_id: "operator" }],
    applications: Array.from({ length: 65 }, (_, i) => ({ id: i + 1, guardian_id: i < 30 ? "other" : "operator", animal_id: "dog", status: "submitted", created_at: String(i).padStart(4, "0") })),
    direct_animals: [{ id: 1, name: "검토 동물", status: "review", member_id: "owner", created_at: "2026-09-07" }],
    public_animals: [{id:"animal-one",name:"공공 동물",hidden:false,updated:"2026-09-07"}],
    verification_requests: [{ id: 1, requested_role: "admin", member_id: "owner", status: "submitted" }],
    fundraisers: [{ id: 1, status: "open", title: "모금" }, { id: 2, status: "review", title: "모금 검토" }],
    api_idempotency_keys: [], admin_audit_logs: [],
  };
  t.mock.method(globalThis, "fetch", async (input, options = {}) => {
    const url = new URL(typeof input === "string" || input instanceof URL ? input : input.url);
    assert.equal(url.hostname, "operations.example.test");
    const table = url.pathname.split("/").at(-1);
    const method = options.method || "GET";
    requests.push({ table, method, params: url.searchParams });
    if (table === "members") return Response.json([{ id: "operator", display_name: "운영 검증", email: "test@example.test", role, verified, sanctioned }]);
    if (table === "auth_sessions") return Response.json(db.auth_sessions);
    if (table === "review_operation") {
      const args = JSON.parse(options.body);
      const tableName = { "registration-status": "direct_animals", "verification-status": "verification_requests", "fundraiser-status": "fundraisers" }[args.p_action];
      const row = db[tableName]?.find(row => row.id === args.p_id);
      if (!row) return Response.json({ code: "P0002", message: "missing" }, { status: 404 });
      if (row.status !== args.p_expected || row.status === args.p_status) return Response.json({ code: "40001", message: "stale" }, { status: 409 });
      if (args.p_action === "verification-status" && (!row.evidence_key || !["shelter","foster","veterinarian"].includes(row.requested_role))) return Response.json({ code: "P0001", message: "invalid role" }, { status: 400 });
      if (args.p_action === "verification-status" && row.member_id === "operator" && args.p_status === "verified") return Response.json({ code: "42501", message: "admin protection" }, { status: 403 });
      if (args.p_action === "fundraiser-status" && !((row.status === "review" && ["open","rejected"].includes(args.p_status)) || (row.status === "open" && args.p_status === "settled"))) return Response.json({ code: "P0001", message: "invalid transition" }, { status: 400 });
      if (failAudit) return Response.json({ code: "XX000", message: "audit unavailable" }, { status: 500 });
      row.status = args.p_status;
      db.admin_audit_logs.push({ action: "operation:" + args.p_action, after_json: JSON.stringify({ note: args.p_note }) });
      return Response.json(row);
    }
    assert.ok(Object.hasOwn(db, table), "Unexpected table " + table);
    const matches = row => [...url.searchParams].every(([key, value]) => value.startsWith("eq.") ? String(row[key]) === value.slice(3) : value.startsWith("in.(") ? value.slice(4,-1).split(",").includes(String(row[key])) : true);
    let rows = db[table].filter(matches);
    if (method === "POST") {
      const row = JSON.parse(options.body);
      if (table === "admin_audit_logs" && failAudit) return Response.json({ message: "audit unavailable" }, { status: 500 });
      if (table === "api_idempotency_keys" && db[table].some(item => item.scope === row.scope && item.subject_hash === row.subject_hash && item.idempotency_key === row.idempotency_key)) return Response.json({ code: "23505" }, { status: 409 });
      db[table].push(row); rows = [row];
    }
    if (method === "PATCH") { const changes = JSON.parse(options.body); rows.forEach(row => Object.assign(row, changes)); }
    const count = rows.length;
    if (method === "GET") { const offset = Number(url.searchParams.get("offset") || 0), limit = Number(url.searchParams.get("limit") || count); rows = rows.slice(offset, offset + limit); }
    const headers = new Headers(options.headers);
    if (headers.get("accept")?.includes("vnd.pgrst.object") && rows.length !== 1) return Response.json({ code: "PGRST116", message: "Expected one row" }, { status: 406 });
    return Response.json(headers.get("accept")?.includes("vnd.pgrst.object") ? rows[0] : rows, { headers: { "content-range": "0-" + Math.max(0, rows.length - 1) + "/" + count } });
  });
  const get = query => GET(new Request("https://www.firstfriend.me/api/operations?" + query));
  const post = (payload, key = crypto.randomUUID(), origin = "https://www.firstfriend.me") => POST(new Request("https://www.firstfriend.me/api/operations", { method: "POST", headers: { origin, "content-type": "application/json", "idempotency-key": key }, body: JSON.stringify(payload) }));
  const approval = { action: "registration-status", id: 1, status: "published", expectedStatus: "review", note: "증빙 확인 완료" };
  await t.test("rejects missing session, ordinary member and unverified shelter", async () => {
    globalThis.__operationsUser = null; assert.equal((await get("")).status, 401);
    globalThis.__operationsUser = { userId: "operator" };
    role = "member"; assert.equal((await get("")).status, 403); assert.equal((await post(approval)).status, 403);
    role = "shelter"; verified = false; assert.equal((await get("")).status, 403); verified = true;
    assert.equal((await get("resource=members")).status, 403);
  });
  await t.test("filters ownership before paging and returns count beyond old 50-row cap", async () => {
    const response = await get("resource=applications&page=2");
    assert.equal(response.status, 200);
    const body = await response.json();
    assert.equal(body.total, 35); assert.equal(body.rows.length, 15); assert.ok(body.rows.every(row => row.guardian_id === "operator"));
    assert.equal(response.headers.get("cache-control"), "no-store");
    role = "admin"; assert.equal((await (await get("resource=applications&page=3")).json()).rows.length, 20);
  });
  await t.test("validates filters and escapes literal search wildcards", async () => {
    for (const query of ["resource=__proto__", "page=NaN", "page=-1", "status=wrong", "sort=sql", "q=" + "x".repeat(101)]) assert.throws(() => parseOperationQuery(new URLSearchParams(query)));
    await get("resource=registrations&q=%25_");
    assert.equal(requests.at(-1).params.get("name"), "ilike.%\\%\\_%");
  });
  await t.test("public animal management searches the real table and restricts search fields",async()=>{
    role="admin";
    assert.equal((await get("resource=publicAnimals&field=shelter_name&q=보호소&visibility=hidden")).status,200);
    assert.equal(requests.at(-1).table,"public_animals");
    assert.equal(requests.at(-1).params.get("hidden"),"eq.true");
    assert.equal(requests.at(-1).params.get("order"),"updated.asc,id.asc");
    assert.equal((await get("resource=publicAnimals&field=last_seen_sync")).status,400);
    assert.equal((await get("resource=publicAnimals&activity=inactive&species=cat")).status,200);
    assert.equal(requests.at(-1).params.get("active"),"eq.false");
    assert.equal(requests.at(-1).params.get("species"),"eq.고양이");
    for(const query of ["resource=members&activity=active","resource=publicAnimals&activity=invalid","resource=publicAnimals&species=invalid"])assert.equal((await get(query)).status,400);
    role="shelter";assert.equal((await get("resource=publicAnimals")).status,403);role="admin";
  });
  await t.test("pending queue filters rows and total before pagination and rejects conflicting states", async () => {
    db.applications.push({id:66,guardian_id:"operator",animal_id:"cat",status:"completed",created_at:"9999"});
    const body=await (await get("resource=applications&queue=pending&page=4")).json();
    assert.equal(body.total,65);assert.equal(body.rows.length,5);
    assert.ok(body.rows.every(row=>row.status==="submitted"));
    assert.equal(requests.at(-1).params.get("status"),"in.(submitted,review,consulting)");
    for(const query of ["resource=members&queue=pending","queue=unknown","queue=pending&status=approved"])assert.equal((await get(query)).status,400);
  });
  await t.test("rejects cross-origin actions and requires idempotency key", async () => {
    assert.equal((await post(approval, crypto.randomUUID(), "https://other.example")).status, 403);
    assert.equal((await post(approval, "")).status, 400);
  });
  await t.test("approval updates once, writes reason to audit, replay does not repeat", async () => {
    const key = crypto.randomUUID();
    const response = await post(approval, key);
    assert.equal(response.status, 200, await response.clone().text());
    assert.equal(db.direct_animals[0].status, "published");
    assert.equal(db.admin_audit_logs.length, 1);
    assert.equal(JSON.parse(db.admin_audit_logs[0].after_json).note, approval.note);
    assert.equal((await post(approval, key)).headers.get("idempotency-replayed"), "true");
    assert.equal(db.admin_audit_logs.length, 1);
    assert.equal((await post(approval)).status, 409);
  });
  await t.test("cannot grant administrator via role certification", async () => {
    assert.equal((await post({ action: "verification-status", id: 1, status: "verified", expectedStatus: "submitted", note: "역할 인증" })).status, 400);
  });
  await t.test("cannot demote an administrator through an older certification request", async () => {
    db.verification_requests.push({ id: 2, requested_role: "shelter", member_id: "operator", status: "submitted", evidence_key: "private-evidence/operator/proof" });
    assert.equal((await post({ action: "verification-status", id: 2, status: "verified", expectedStatus: "submitted", note: "증빙 심사" })).status, 403);
    assert.equal(db.verification_requests[1].status, "submitted");
  });
  await t.test("fundraiser completion follows approval and cannot skip review", async () => {
    assert.equal((await post({ action: "fundraiser-status", id: 1, status: "settled", expectedStatus: "open", note: "모금 종료" })).status, 200);
    assert.equal(db.fundraisers[0].status, "settled");
    assert.equal((await post({ action: "fundraiser-status", id: 2, status: "settled", expectedStatus: "review", note: "잘못된 종료" })).status, 400);
    assert.equal(db.fundraisers[1].status, "review");
  });
  await t.test("private review evidence rejects sanctioned operators and ordinary members", async () => {
    const req = () => new Request("https://www.firstfriend.me/api/operations/evidence?key=private-evidence/proof");
    sanctioned = true; assert.equal((await evidence(req())).status, 403);
    sanctioned = false; role = "member"; assert.equal((await evidence(req())).status, 403);
    role = "admin";
  });
  await t.test("concurrent reviewers cannot approve the same version twice", async () => {
    db.direct_animals.push({ id: 2, name: "동시 검토", status: "review" });
    const before = db.admin_audit_logs.length;
    const responses = await Promise.all([post({ ...approval, id: 2 }), post({ ...approval, id: 2 })]);
    assert.deepEqual(responses.map(response => response.status).sort(), [200, 409]);
    assert.equal(db.admin_audit_logs.length, before + 1);
  });
  await t.test("review audit failure rolls back the mutation and returns an error", async () => {
    failAudit = true;
    const key = crypto.randomUUID(), close = { ...approval, status: "closed", expectedStatus: "published" };
    assert.equal((await post(close, key)).status, 503);
    assert.equal((await post(close, key)).status, 503);
    assert.equal(db.direct_animals[0].status, "published");
    failAudit = false;
  });
  await t.test("built operations page renders SEED controls only for operators", async () => {
    const { default: worker } = await import("../dist/server/index.js");
    const render = () => worker.fetch(new Request("http://localhost/operations?resource=registrations", { headers: { accept: "text/html", host: "localhost", cookie: "ff_session=test-session" } }), { ASSETS: { fetch: async () => new Response(null, { status: 404 }) } }, { waitUntil() {}, passThroughOnException() {} });
    role = "admin";
    const response = await render(), html = await response.text();
    assert.equal(response.status, 200);
    assert.match(html, /확인할 업무/); assert.match(html, /동물 등록/); assert.match(html, /data-seed/);
    assert.match(html, /ff-operations-shell/); assert.doesNotMatch(html, /class="ff-shell"/);
    assert.match(html, /operations-navigation/); assert.match(html, /안전과 운영/);
    for(const label of ["회원 관리","이야기 관리","고객 문의","이메일·마케팅","발송 기록","운영 요약"])assert.ok(html.includes(label));
    role = "member";
    const denied = await (await render()).text();
    assert.match(denied, /운영 권한이 필요해요/); assert.doesNotMatch(denied, /확인할 업무/);
  });
  await t.test("management APIs reject ordinary users and cross-origin writes", async()=>{
    const req=(origin="https://www.firstfriend.me")=>new Request("https://www.firstfriend.me/api/operations/manage",{method:"POST",headers:{origin,"content-type":"application/json"},body:"{}"});
    role="member";assert.equal((await manage(req())).status,403);assert.equal((await outreach(req())).status,403);
    role="admin";assert.equal((await manage(req("https://other.example"))).status,403);
  });
  await t.test("management requires complete row version and verified mail configuration",async()=>{
    role="admin";
    const req=body=>new Request("https://www.firstfriend.me/api/operations/manage",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify(body)});
    assert.equal((await manage(req({resource:"members",id:"operator",action:"suspend",value:{},expected:{id:"operator"},note:"제한 사유"}))).status,400);
    const expected={id:1,title:"제목",body:"본문",channel:"email",audience:"all",href:"/mypage",status:"draft",created_at:"2026-09-07"};
    assert.equal((await manage(req({resource:"campaigns",id:1,action:"queue",value:{},expected,note:"발송 준비"}))).status,422);
    assert.equal((await manage(req({resource:"campaigns",action:"create",value:{href:"//evil.example"},note:"초안 작성"}))).status,400);
  });
  await t.test("member response excludes passwords, tokens and provider identifiers",async()=>{
    role="admin";db.auth_accounts.push({member_id:"operator",provider:"google",email_verified:true,password_hash:"secret",provider_user_id:"private"});
    const body=await (await get("resource=members")).json();
    assert.equal(body.rows[0].login_methods,"google (이메일 확인됨)");assert.ok(!JSON.stringify(body).includes("secret"));assert.ok(!JSON.stringify(body).includes("private"));
    assert.equal((await get("resource=members&field=password_hash")).status,400);
  });
});
