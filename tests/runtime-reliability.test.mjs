import assert from "node:assert/strict";
import test from "node:test";
import { createServer } from "vite";

test("saved animal batches preserve order and visibility with bounded database requests", async t => {
  const server = await createServer({ configFile: false, envFile: false, optimizeDeps: { noDiscovery: true, include: [] }, server: { middlewareMode: true, hmr: false }, appType: "custom", logLevel: "error" });
  t.after(() => server.close());
  for (const [key, value] of Object.entries({ NEXT_PUBLIC_SUPABASE_URL: "https://batch.example.test", SUPABASE_SECRET_KEY: "test-only" })) {
    const previous = process.env[key]; process.env[key] = value;
    t.after(() => { if (previous === undefined) delete process.env[key]; else process.env[key] = previous; });
  }
  const calls = []; let fail = false;
  t.mock.method(globalThis, "fetch", async (input) => {
    const url = new URL(typeof input === "string" || input instanceof URL ? input : input.url);
    assert.equal(url.hostname, "batch.example.test");
    const table = url.pathname.split("/").at(-1); calls.push(table);
    const ids = url.searchParams.get("id")?.slice(4, -1).split(",") || [];
    if (table === "visible_public_animals") return fail ? Response.json({ message: "offline" }, { status: 503 }) : Response.json(ids.filter(id => id.startsWith("public-")).reverse().map(id => ({ id, name: id, age: "2025", image_1: "https://example.test/photo.jpg" })));
    if (table === "public_lost_animals") { assert.equal(url.searchParams.get("active"), "eq.true"); return Response.json(ids.includes("lost-fixture") ? [{ id: "lost-fixture", species: "고양이", breed: "믹스", happened_at: "20260901" }] : []); }
    if (table === "direct_animals") {
      assert.equal(url.searchParams.get("status"), "eq.published");
      return Response.json(ids.filter(id => id !== "2").map(id => ({ id: Number(id), name: "임보", rescue_story: "소개", reconfirmed_at: id === "3" ? "2000-01-01" : null })));
    }
    assert.equal(table, "animal_media"); return Response.json([]);
  });
  const { getAnimalsByIds } = await server.ssrLoadModule("/lib/public-data.ts");
  assert.deepEqual(await getAnimalsByIds([]), []); assert.equal(calls.length, 0);
  const thirty = Array.from({ length: 30 }, (_, i) => "public-" + i);
  assert.deepEqual((await getAnimalsByIds(thirty)).map(a => a.id), thirty);
  assert.deepEqual(calls, ["visible_public_animals"], "30 public favorites need one animal query");
  calls.length = 0;
  const mixed = await getAnimalsByIds(["direct-1", "public-2", "lost-fixture", "direct-2", "direct-3", "hidden-fixture", "public-2"]);
  assert.deepEqual(mixed.map(a => a?.id), ["direct-1", "public-2", "lost-fixture", undefined, undefined, undefined, "public-2"]);
  assert.equal(calls.length, 4, "mixed types are grouped, including media");
  calls.length = 0;
  const large = Array.from({ length: 230 }, (_, i) => "public-" + i);
  assert.equal((await getAnimalsByIds(large)).length, 230); assert.equal(calls.length, 3);
  fail = true; await assert.rejects(getAnimalsByIds(["public-1"]));
});

test("display identity is non-authorizing, private and compatible with existing sessions", async t => {
  const server = await createServer({ configFile: false, envFile: false, optimizeDeps: { noDiscovery: true, include: [] }, server: { middlewareMode: true, hmr: false }, appType: "custom", logLevel: "error" });
  t.after(() => server.close());
  const { GET } = await server.ssrLoadModule("/app/api/auth/display-scope/route.ts");
  const auth = await server.ssrLoadModule("/lib/app-auth.ts");
  t.mock.method(globalThis, "fetch", () => assert.fail("Display identity must not query the database"));
  const guest = await GET(new Request("https://www.firstfriend.me/api/auth/display-scope", { headers: { cookie: "ff_display_scope=aaaaaaaaaaaaaaaaaaaaaaaa" } }));
  assert.deepEqual(await guest.json(), { scope: "guest" }, "a display cookie cannot establish a session");
  const existing = await GET(new Request("https://www.firstfriend.me/api/auth/display-scope", { headers: { cookie: "ff_session=old-private-token" } }));
  const { scope } = await existing.json();
  assert.match(scope, /^[a-f0-9]{24}$/); assert.equal(scope, await auth.sessionDisplayScope("old-private-token"));
  assert.equal(existing.headers.get("cache-control"), "private, no-store");
  assert.doesNotMatch(existing.headers.get("set-cookie"), /old-private-token|HttpOnly/);
  const cookies = (await auth.sessionHeaders("new-private-token", true)).getSetCookie();
  assert.equal(cookies.length, 2);
  assert.match(cookies.find(c => c.startsWith("ff_session=")), /HttpOnly; Secure;/);
  assert.notEqual(await auth.sessionDisplayScope("new-private-token"), scope);
  const originalDocument = Object.getOwnPropertyDescriptor(globalThis, "document");
  t.after(() => { if (originalDocument) Object.defineProperty(globalThis, "document", originalDocument); else delete globalThis.document; });
  globalThis.document = { cookie: "ff_display_scope=bbbbbbbbbbbbbbbbbbbbbbbb", body: { dataset: { favoriteScope: "aaaaaaaaaaaaaaaaaaaaaaaa" } } };
  const display = await server.ssrLoadModule("/app/components/display-scope.ts");
  assert.equal(display.readDisplayScope(), "bbbbbbbbbbbbbbbbbbbbbbbb", "current cookie replaces an old page's display identity");
  let calls = 0, finish;
  t.mock.method(globalThis, "fetch", async () => { calls++; return new Promise(resolve => { finish = resolve; }); });
  const refresh = display.ensureDisplayScope(true), follower = display.ensureDisplayScope();
  assert.equal(calls, 1, "all cards share one migration or refresh request");
  finish(Response.json({ scope: "guest" }));
  assert.deepEqual(await Promise.all([refresh, follower]), ["guest", "guest"]);
});

test("public home and participate render without inspecting member data", async t => {
  t.mock.method(globalThis, "fetch", () => assert.fail("Public shell rendering must not read member data"));
  const { default: worker } = await import("../dist/server/index.js");
  for (const path of ["/", "/participate"]) {
    for (const token of ["private-one", "private-two"]) {
      const background = [];
      const response = await worker.fetch(new Request(`http://localhost${path}`, { headers: { cookie: `ff_session=${token}`, accept: "text/html" } }), { ASSETS: { fetch: async () => new Response(null, { status: 404 }) } }, { waitUntil(promise) { background.push(promise); }, passThroughOnException() {} });
      assert.equal(response.status, 200);
      const html = await response.text();
      assert.doesNotMatch(html, /private-one|private-two|data-favorite-scope=/);
      await Promise.all(background);
      // The first streamed response remains uncacheable until rendering is verified.
      if (token === "private-two") assert.match(response.headers.get("cache-control") || "", /s-maxage=/);
    }
  }
});

test("favorites streams its loading boundary before the session database responds", async t => {
  for (const [key, value] of Object.entries({ NEXT_PUBLIC_SUPABASE_URL: "https://streaming.example.test", SUPABASE_SECRET_KEY: "test-only" })) {
    const previous = process.env[key]; process.env[key] = value;
    t.after(() => { if (previous === undefined) delete process.env[key]; else process.env[key] = previous; });
  }
  let release;
  const pending = new Promise(resolve => { release = resolve; });
  t.after(() => release());
  t.mock.method(globalThis, "fetch", async input => {
    const url = new URL(typeof input === "string" || input instanceof URL ? input : input.url);
    assert.equal(url.hostname, "streaming.example.test");
    assert.ok(url.pathname.endsWith("auth_sessions"));
    await pending;
    return Response.json([]);
  });
  const { default: worker } = await import("../dist/server/index.js");
  let blocked = false;
  const responseTimeout = setTimeout(() => { blocked = true; release(); }, 3000);
  t.after(() => clearTimeout(responseTimeout));
  const response = await worker.fetch(new Request("http://localhost/mypage/favorites", { headers: { cookie: "ff_session=test-only", accept: "text/html" } }), { ASSETS: { fetch: async () => new Response(null, { status: 404 }) } }, { waitUntil() {}, passThroughOnException() {} });
  clearTimeout(responseTimeout);
  assert.equal(blocked, false, "Response must start before the database resolves");
  const reader = response.body.getReader(), decoder = new TextDecoder();
  let html = "";
  const first = (async () => {
    while (!html.includes("페이지를 불러오는 중")) {
      const chunk = await reader.read();
      assert.equal(chunk.done, false);
      html += decoder.decode(chunk.value, { stream: true });
    }
  })();
  let timeout;
  try {
    await Promise.race([first, new Promise((_, reject) => { timeout = setTimeout(() => reject(new Error("Page waited for the database instead of streaming loading UI")), 3000); })]);
  } finally { clearTimeout(timeout); release(); }
  while (true) { const chunk = await reader.read(); if (chunk.done) break; html += decoder.decode(chunk.value, { stream: true }); }
  assert.match(html, /로그인 후 스크랩한 친구/);
});

test("sync checkpoints and auth infrastructure failures preserve existing data", async t => {
  const server = await createServer({ configFile: false, envFile: false, optimizeDeps: { noDiscovery: true, include: [] }, server: { middlewareMode: true, hmr: false }, appType: "custom", logLevel: "error" });
  t.after(() => server.close());
  for (const [key, value] of Object.entries({ NEXT_PUBLIC_SUPABASE_URL: "https://reliability.example.test", SUPABASE_SECRET_KEY: "test-only", PUBLIC_DATA_API_KEY: "test-only" })) {
    const previous = process.env[key]; process.env[key] = value;
    t.after(() => { if (previous === undefined) delete process.env[key]; else process.env[key] = previous; });
  }
  const store = await server.ssrLoadModule("/lib/public-animal-store.ts");
  const auth = await server.ssrLoadModule("/lib/app-auth.ts");
  let mode = "empty", deactivations = 0, savedState, clock = Date.now();
  const yesterday = new Date(clock - 86400000);
  const date = value => value.toISOString().slice(0, 10).replaceAll("-", "");
  const oldRange = { syncId: "prior-run", startDate: date(new Date(clock - 366 * 86400000)), endDate: date(yesterday), nextPage: 2, count: 100, total: 300, updatedAt: yesterday.toISOString() };
  const envelope = (items, totalCount) => Response.json({ response: { header: { resultCode: "00" }, body: { items: { item: items }, ...(totalCount === undefined ? {} : { totalCount }) } } });
  t.mock.method(globalThis, "fetch", async (input, options = {}) => {
    const url = new URL(typeof input === "string" || input instanceof URL ? input : input.url);
    if (url.hostname === "apis.data.go.kr") {
      if (url.pathname.includes("lossInfo")) {
        assert.equal(url.searchParams.get("pageNo"), "2");
        assert.equal(url.searchParams.get("endde"), oldRange.endDate);
        clock += 210000;
        return envelope([{ happenDt: "20260901", happenAddr: "서울", kindCd: "강아지", popfile: "https://openapi.animal.go.kr/test.jpg" }], 300);
      }
      return envelope([], mode === "missing-total" ? undefined : 0);
    }
    assert.equal(url.hostname, "reliability.example.test");
    const table = url.pathname.split("/").at(-1), method = options.method || "GET";
    if (table === "try_acquire_sync_lock" || table === "release_sync_lock") return Response.json(true);
    if (table === "auth_sessions") return mode === "auth-error" ? Response.json({ message: "offline" }, { status: 503 }) : Response.json([]);
    if (table === "members") return Response.json({ message: "offline" }, { status: 503 });
    if (table === "public_sync_state") {
      if (method === "GET") return Response.json({ status: "running", message: JSON.stringify(oldRange) });
      savedState = JSON.parse(options.body);
      return new Response(null, { status: 204 });
    }
    if (table === "public_animals" || table === "public_lost_animals" || table === "public_shelters") {
      if (method === "PATCH") deactivations++;
      return new Response(null, { status: 204 });
    }
    assert.fail("Unexpected request " + url.pathname);
  });
  await t.test("empty and malformed totals never deactivate animals", async () => {
    await assert.rejects(store.syncPublicAnimals(), /0건/);
    assert.equal(deactivations, 0);
    mode = "missing-total";
    await assert.rejects(store.syncPublicAnimals(), /전체 건수/);
    assert.equal(deactivations, 0);
  });
  await t.test("next-day retry keeps its query range and yields at the deadline", async st => {
    mode = "lost";
    st.mock.method(Date, "now", () => clock);
    const result = await store.syncPublicLostAnimals();
    assert.equal(result.complete, false);
    assert.equal(result.nextPage, 3);
    const checkpoint = JSON.parse(savedState.message);
    assert.equal(checkpoint.endDate, oldRange.endDate);
    assert.equal(checkpoint.syncId, oldRange.syncId);
    assert.equal(checkpoint.nextPage, 3);
    assert.equal(deactivations, 0);
  });
  await t.test("missing sessions remain signed out but DB failures propagate", async () => {
    mode = "no-session";
    assert.equal(await auth.memberFromSession(undefined, "token"), null);
    mode = "auth-error";
    await assert.rejects(auth.memberFromSession(undefined, "token"), /로그인 정보를/);
  });
});

test("profile reuses the authenticated member without exposing private fields", async t => {
  let hasCookie = true, failDb = false, sessionReads = 0, memberReads = 0;
  globalThis.__reliabilityCookie = () => hasCookie ? { value: "token" } : undefined;
  t.after(() => delete globalThis.__reliabilityCookie);
  const server = await createServer({ configFile: false, envFile: false, optimizeDeps: { noDiscovery: true, include: [] }, server: { middlewareMode: true, hmr: false }, appType: "custom", logLevel: "error", plugins: [{
    name: "cookie-fixture", enforce: "pre",
    resolveId(id) { if (id === "next/headers") return "\0cookie-fixture"; if (id === "next/navigation") return "\0navigation-fixture"; },
    load(id) { if (id === "\0cookie-fixture") return "export async function cookies(){return {get:()=>globalThis.__reliabilityCookie()}}"; if (id === "\0navigation-fixture") return "export function redirect(){throw new Error('unexpected redirect')}"; },
  }] });
  t.after(() => server.close());
  for (const [key, value] of Object.entries({ NEXT_PUBLIC_SUPABASE_URL: "https://reliability.example.test", SUPABASE_SECRET_KEY: "test-only" })) {
    const previous = process.env[key]; process.env[key] = value;
    t.after(() => { if (previous === undefined) delete process.env[key]; else process.env[key] = previous; });
  }
  t.mock.method(globalThis, "fetch", async (input) => {
    const url = new URL(typeof input === "string" || input instanceof URL ? input : input.url);
    assert.equal(url.hostname, "reliability.example.test");
    if (url.pathname.endsWith("auth_sessions")) {
      sessionReads++;
      assert.equal(url.searchParams.get("select"), "members!inner(*)");
      assert.match(url.searchParams.get("token_hash"), /^eq\.[a-f0-9]{64}$/);
      assert.match(url.searchParams.get("expires_at"), /^gt\./);
      return failDb ? Response.json({ message: "failure" }, { status: 400 }) : Response.json([{ members: { id: "member", display_name: "회원", email: "test@example.test", home_region: "서울 마포구", role: "admin", private_note: "must-not-leak", sanctioned: false } }]);
    }
    assert.ok(url.pathname.endsWith("members")); memberReads++;
    return Response.json([{ id: "member", display_name: "회원", email: "test@example.test", home_region: "서울 마포구", role: "admin", private_note: "must-not-leak", sanctioned: false }]);
  });
  const profile = await server.ssrLoadModule("/app/api/profile/route.ts");
  const auth = await server.ssrLoadModule("/app/chatgpt-auth.ts");
  const result = await profile.GET();
  assert.deepEqual(await result.json(), { homeRegion: "서울 마포구" });
  assert.equal(sessionReads, 1); assert.equal(memberReads, 0);
  assert.deepEqual(Object.keys(await auth.getChatGPTUser()).sort(), ["displayName", "email", "fullName", "userId"]);
  failDb = true;
  assert.equal((await profile.GET()).status, 503);
  hasCookie = false;
  assert.deepEqual(await (await profile.GET()).json(), { homeRegion: "" });
});

test("AI descriptions only report completion after a confirmed DB write", async t => {
  const animal = { id: "test-animal", image: "https://openapi.animal.go.kr/test.jpg", updated: "2026-09-08", species: "강아지", breed: "품종 미상", age: "1살", sex: "미상", colors: ["하양"], traits: [], summary: "" };
  const server = await createServer({ configFile: false, envFile: false, optimizeDeps: { noDiscovery: true, include: [] }, server: { middlewareMode: true, hmr: false }, appType: "custom", logLevel: "error", plugins: [{
    name: "animal-fixture", enforce: "pre",
    resolveId(id) { if (id === "./public-data") return "\0animal-fixture"; },
    load(id) { if (id === "\0animal-fixture") return `export async function getAnimalById(){return ${JSON.stringify(animal)}}`; },
  }] });
  t.after(() => server.close());
  for (const [key, value] of Object.entries({ NEXT_PUBLIC_SUPABASE_URL: "https://reliability.example.test", SUPABASE_SECRET_KEY: "test-only", GEMINI_API_KEY: "test-only" })) {
    const previous = process.env[key]; process.env[key] = value;
    t.after(() => { if (previous === undefined) delete process.env[key]; else process.env[key] = previous; });
  }
  const ai = await server.ssrLoadModule("/lib/animal-ai.ts");
  let failSave = true, saveAttempts = 0;
  t.mock.method(globalThis, "fetch", async (input, options = {}) => {
    const url = new URL(typeof input === "string" || input instanceof URL ? input : input.url);
    if (url.hostname === "openapi.animal.go.kr") return new Response(null, { status: 404 });
    assert.equal(url.hostname, "reliability.example.test");
    if ((options.method || "GET") === "GET") return Response.json({ animal_id: animal.id, analysis_key: ai.createAnimalAnalysisKey(animal), status: "pending", retry_count: 0 });
    const row = JSON.parse(options.body);
    if (row.status === "processing") return Response.json({ animal_id: animal.id });
    saveAttempts++;
    return failSave ? Response.json({ message: "write rejected" }, { status: 400 }) : Response.json({ animal_id: animal.id });
  });
  await assert.rejects(ai.processAnimalAiJob(animal.id), error => error.message === "write rejected");
  assert.equal(saveAttempts, 1, "DB failure must not trigger a second fallback save");
  failSave = false;
  const result = await ai.processAnimalAiJob(animal.id);
  assert.equal(result.status, "completed");
  assert.equal(result.source, "public-data");
});
