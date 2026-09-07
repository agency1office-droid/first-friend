import assert from "node:assert/strict";
import test from "node:test";
import { createServer } from "vite";

test("operations permissions, real pagination and guarded approval", async t => {
  const server = await createServer({ configFile: false, envFile: false, server: { middlewareMode: true }, appType: "custom", logLevel: "error", plugins: [{
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
  const { parseOperationQuery } = await server.ssrLoadModule("/lib/operations.ts");
  let role = "admin", verified = true, failAudit = false;
  const requests = [];
  const db = {
    members: [],
    auth_sessions: [{ member_id: "operator" }],
    applications: Array.from({ length: 65 }, (_, i) => ({ id: i + 1, guardian_id: i < 30 ? "other" : "operator", animal_id: "dog", status: "submitted", created_at: String(i).padStart(4, "0") })),
    direct_animals: [{ id: 1, name: "검토 동물", status: "review", member_id: "owner", created_at: "2026-09-07" }],
    verification_requests: [{ id: 1, requested_role: "admin", member_id: "owner", status: "submitted" }],
    api_idempotency_keys: [], admin_audit_logs: [],
  };
  t.mock.method(globalThis, "fetch", async (input, options = {}) => {
    const url = new URL(typeof input === "string" || input instanceof URL ? input : input.url);
    assert.equal(url.hostname, "operations.example.test");
    const table = url.pathname.split("/").at(-1);
    const method = options.method || "GET";
    requests.push({ table, method, params: url.searchParams });
    if (table === "members") return Response.json([{ id: "operator", display_name: "운영 검증", email: "test@example.test", role, verified, sanctioned: false }]);
    if (table === "auth_sessions") return Response.json(db.auth_sessions);
    assert.ok(Object.hasOwn(db, table), "Unexpected table " + table);
    const matches = row => [...url.searchParams].every(([key, value]) => !value.startsWith("eq.") || String(row[key]) === value.slice(3));
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
  await t.test("concurrent reviewers cannot approve the same version twice", async () => {
    db.direct_animals.push({ id: 2, name: "동시 검토", status: "review" });
    const before = db.admin_audit_logs.length;
    const responses = await Promise.all([post({ ...approval, id: 2 }), post({ ...approval, id: 2 })]);
    assert.deepEqual(responses.map(response => response.status).sort(), [200, 409]);
    assert.equal(db.admin_audit_logs.length, before + 1);
  });
  await t.test("partial failure is visible and same request stays blocked", async () => {
    failAudit = true;
    const key = crypto.randomUUID(), close = { ...approval, status: "closed", expectedStatus: "published" };
    assert.equal((await post(close, key)).status, 503);
    assert.equal((await post(close, key)).status, 409);
    assert.equal(db.direct_animals[0].status, "closed");
  });
  await t.test("built operations page renders SEED controls only for operators", async () => {
    const { default: worker } = await import("../dist/server/index.js");
    const render = () => worker.fetch(new Request("http://localhost/operations?resource=registrations", { headers: { accept: "text/html", host: "localhost", cookie: "ff_session=test-session" } }), { ASSETS: { fetch: async () => new Response(null, { status: 404 }) } }, { waitUntil() {}, passThroughOnException() {} });
    role = "admin";
    const response = await render(), html = await response.text();
    assert.equal(response.status, 200);
    assert.match(html, /확인할 업무/); assert.match(html, /동물 등록/); assert.match(html, /data-seed/);
    role = "member";
    const denied = await (await render()).text();
    assert.match(denied, /운영 권한이 필요해요/); assert.doesNotMatch(denied, /확인할 업무/);
  });
});
