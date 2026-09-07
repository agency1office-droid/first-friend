import assert from "node:assert/strict";
import test from "node:test";
import { createServer } from "vite";

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
    if (table === "auth_sessions") return mode === "auth-error" ? Response.json({ message: "offline" }, { status: 503 }) : Response.json(mode === "member-error" ? [{ member_id: "m1" }] : []);
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
    mode = "member-error";
    await assert.rejects(auth.memberFromSession(undefined, "token"), /회원 정보를/);
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
    if (url.pathname.endsWith("auth_sessions")) { sessionReads++; return failDb ? Response.json({ message: "failure" }, { status: 400 }) : Response.json([{ member_id: "member" }]); }
    assert.ok(url.pathname.endsWith("members")); memberReads++;
    return Response.json([{ id: "member", display_name: "회원", email: "test@example.test", home_region: "서울 마포구", role: "admin", private_note: "must-not-leak", sanctioned: false }]);
  });
  const profile = await server.ssrLoadModule("/app/api/profile/route.ts");
  const auth = await server.ssrLoadModule("/app/chatgpt-auth.ts");
  const result = await profile.GET();
  assert.deepEqual(await result.json(), { homeRegion: "서울 마포구" });
  assert.equal(sessionReads, 1); assert.equal(memberReads, 1);
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
