import assert from "node:assert/strict";
import test from "node:test";
import { createServer } from "vite";

test("profile and saved search API preserve successful state and reject malformed criteria", async t => {
  const server = await createServer({ configFile: false, envFile: false, optimizeDeps: { noDiscovery: true, include: [] }, server: { middlewareMode: true, hmr: false }, appType: "custom", logLevel: "error", plugins: [{
    name: "audit-user", enforce: "pre",
    resolveId(id) { if (id.endsWith("chatgpt-auth")) return "\0audit-user"; if (id.endsWith("public-animal-store")) return "\0audit-animals"; },
    load(id) {
      if (id === "\0audit-user") return 'export async function getChatGPTUser(){return {userId:"audit-member"};} export const getAuthenticatedMember=getChatGPTUser;';
      if (id === "\0audit-animals") return 'export async function getNearbyAnimalsPage(){return {items:[{id:"animal",name:"친구",breed:"믹스",species:"개",ageGroup:"성견",sex:"수컷",region:"서울",colors:[],traits:[]}]};}';
    },
  }] });
  t.after(() => server.close());
  for (const [key, value] of Object.entries({ NEXT_PUBLIC_SUPABASE_URL: "https://audit.example.test", SUPABASE_SECRET_KEY: "test-only" })) {
    const old = process.env[key]; process.env[key] = value;
    t.after(() => { if (old === undefined) delete process.env[key]; else process.env[key] = old; });
  }
  let fail = false, writes = 0, legacy = false;
  const row = { id: 1, member_id: "audit-member", name: "서울 개", criteria_json: '{"species":"개","region":"서울"}', alerts_enabled: true, created_at: "2026-09-08" };
  t.mock.method(globalThis, "fetch", async (input, options = {}) => {
    const url = new URL(typeof input === "string" || input instanceof URL ? input : input.url);
    assert.equal(url.hostname, "audit.example.test");
    const table = url.pathname.split("/").at(-1), method = options.method || "GET";
    if (method !== "GET") writes++;
    if (fail) return Response.json({ message: "database unavailable" }, { status: 503 });
    if (table === "members") { assert.equal(url.searchParams.get("id"), "eq.audit-member"); return new Response(null, { status: 204 }); }
    if (table === "saved_searches") {
      if (method === "GET") {
        assert.equal(url.searchParams.get("member_id"), "eq.audit-member");
        return Response.json(legacy ? [null, { tags: "bad" }, { query: 42 }].map((criteria, i) => ({ ...row, id: i + 1, criteria_json: JSON.stringify(criteria) })) : [row]);
      }
      if (method === "PATCH") {
        assert.equal(url.searchParams.get("member_id"), "eq.audit-member");
        return Response.json({ ...row, ...JSON.parse(options.body) });
      }
      if (method === "DELETE") return new Response(null, { status: 204, headers: { "content-range": "*/1" } });
      return Response.json(row, { status: 201 });
    }
    if (table === "notifications") return method === "GET" ? Response.json([]) : new Response(null, { status: 201 });
    assert.fail(table);
  });
  const profile = await server.ssrLoadModule("/app/api/profile/route.ts");
  const searches = await server.ssrLoadModule("/app/api/saved-searches/route.ts");
  const notifications = await server.ssrLoadModule("/app/api/notifications/route.ts");
  const request = (body, method = "POST") => new Request("https://www.firstfriend.me/api/test", { method, headers: { "content-type": "application/json" }, body: JSON.stringify(body) });
  await t.test("region DB failure is not reported as saved; malformed body never writes", async () => {
    for (const body of [null, [], {}]) assert.equal((await profile.POST(request(body))).status, 400);
    assert.equal(writes, 0);
    fail = true; assert.equal((await profile.POST(request({ homeRegion: "서울 강남구" }))).status, 503);
    fail = false; assert.equal((await profile.POST(request({ homeRegion: "서울 강남구" }))).status, 200);
  });
  await t.test("stored alert switch and criteria use the UI contract", async () => {
    const body = await (await searches.GET()).json();
    assert.equal(body.searches[0].alertsEnabled, true);
    assert.deepEqual(JSON.parse(body.searches[0].criteriaJson), { species: "개", region: "서울" });
    const changed = await (await searches.PATCH(request({ id: 1, alertsEnabled: false }, "PATCH"))).json();
    assert.equal(changed.search.alertsEnabled, false);
  });
  await t.test("invalid criteria and patch/delete IDs do not reach writes", async () => {
    const before = writes;
    for (const criteria of [null, [], "test", { tags: "bad" }, { tags: [1] }, { query: 42 }]) assert.equal((await searches.POST(request({ name: "test", criteria }))).status, 400);
    assert.equal((await searches.PATCH(request({ id: 1 }, "PATCH"))).status, 400);
    assert.equal((await searches.DELETE(new Request("https://www.firstfriend.me/api/saved-searches?id=bad"))).status, 400);
    assert.equal(writes, before);
    assert.equal((await searches.POST(request({ name: "test", criteria: { species: "개", tags: [] } }))).status, 201);
  });
  await t.test("DB outage is not an empty list or missing record", async () => {
    fail = true;
    assert.equal((await searches.GET()).status, 503);
    assert.equal((await searches.PATCH(request({ id: 1, alertsEnabled: true }, "PATCH"))).status, 503);
    assert.equal((await searches.DELETE(new Request("https://www.firstfriend.me/api/saved-searches?id=1"))).status, 503);
    fail = false;
  });
  await t.test("malformed legacy criteria cannot take down the notifications page", async () => {
    legacy = true;
    assert.equal((await notifications.GET()).status, 200);
  });
});
