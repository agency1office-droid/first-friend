import assert from "node:assert/strict";
import test from "node:test";
import { createServer } from "vite";

test("social login routes and account isolation", async t => {
  const server = await createServer({ configFile: false, envFile: false, server: { middlewareMode: true }, appType: "custom", logLevel: "error" });
  t.after(() => server.close());
  for (const name of ["NEXT_PUBLIC_SUPABASE_URL", "SUPABASE_SECRET_KEY", "GOOGLE_OAUTH_CLIENT_ID", "GOOGLE_OAUTH_CLIENT_SECRET", "KAKAO_OAUTH_CLIENT_ID", "KAKAO_OAUTH_CLIENT_SECRET", "NAVER_OAUTH_CLIENT_ID", "NAVER_OAUTH_CLIENT_SECRET"]) {
    const previous = process.env[name];
    process.env[name] = name === "NEXT_PUBLIC_SUPABASE_URL" ? "https://database.example.test" : "test-only";
    t.after(() => { if (previous === undefined) delete process.env[name]; else process.env[name] = previous; });
  }
  const { GET: start } = await server.ssrLoadModule("/app/api/auth/oauth/[provider]/route.ts");
  const { GET: callback } = await server.ssrLoadModule("/app/api/auth/oauth/[provider]/callback/route.ts");
  const { GET: logout } = await server.ssrLoadModule("/app/api/auth/logout/route.ts");
  const { safeReturnTo, memberFromSession } = await server.ssrLoadModule("/lib/app-auth.ts");
  const db = { members: [], auth_accounts: [], auth_sessions: [] };
  let profile = {}, failure = "", fetches = 0;
  t.mock.method(globalThis, "fetch", async (input, options = {}) => {
    fetches++;
    const url = new URL(typeof input === "string" || input instanceof URL ? input : input.url);
    if (url.hostname !== "database.example.test") {
      if (failure === "network") throw new Error("test upstream unavailable");
      if (url.pathname.endsWith("/token")) return Response.json(failure === "token" ? { error: "invalid_grant" } : { access_token: "test-provider-token" }, { status: failure === "token" ? 400 : 200 });
      return Response.json(profile);
    }
    const table = url.pathname.split("/").at(-1);
    assert.ok(Object.hasOwn(db, table), `Unexpected DB table ${table}`);
    const matches = row => [...url.searchParams].every(([key, value]) => !value.startsWith("eq.") && !value.startsWith("gt.") || (value.startsWith("eq.") ? String(row[key]) === value.slice(3) : row[key] > value.slice(3)));
    if (options.method === "POST") {
      if (failure === "account" && table === "auth_accounts") return Response.json({ code: "XX000", message: "test insert failure" }, { status: 500 });
      db[table].push(JSON.parse(options.body));
      return new Response(null, { status: 201 });
    }
    if (options.method === "DELETE") { db[table] = db[table].filter(row => !matches(row)); return new Response(null, { status: 204 }); }
    const rows = db[table].filter(matches);
    if (table === "auth_sessions" && url.searchParams.get("select") === "members!inner(*)") {
      return Response.json(rows.map(row => ({ members: db.members.find(member => member.id === row.member_id) })).filter(row => row.members));
    }
    return Response.json(rows);
  });
  const context = provider => ({ params: Promise.resolve({ provider }) });
  const cookieHeader = response => response.headers.getSetCookie().map(value => value.split(";")[0]).join("; ");
  async function begin(provider, origin = "http://localhost:3000", returnTo = "/mypage/favorites?from=login") {
    return start(new Request(`${origin}/api/auth/oauth/${provider}?return_to=${encodeURIComponent(returnTo)}`), context(provider));
  }
  async function finish(provider, started, extra = "code=test-code") {
    const url = new URL(started.headers.get("location"));
    return callback(new Request(`${url.searchParams.get("redirect_uri")}?state=${url.searchParams.get("state")}&${extra}`, { headers: { cookie: cookieHeader(started) } }), context(provider));
  }

  await t.test("all providers start real OAuth, with separate cookies and minimum scopes", async () => {
    for (const provider of ["google", "kakao", "naver"]) {
      const response = await begin(provider);
      assert.equal(response.status, 302);
      const url = new URL(response.headers.get("location"));
      assert.notEqual(url.hostname, "localhost");
      assert.equal(url.searchParams.get("redirect_uri"), `http://localhost:3000/api/auth/oauth/${provider}/callback`);
      assert.equal(response.headers.getSetCookie().length, 2);
      assert.match(response.headers.getSetCookie()[0], /HttpOnly/);
      assert.doesNotMatch(response.headers.getSetCookie()[0], /Secure/);
      if (provider === "kakao") assert.equal(url.searchParams.get("scope"), "profile_nickname");
    }
    assert.equal(fetches, 0, "Starting OAuth must never create a test member");
    const production = await begin("google", "https://www.firstfriend.me");
    assert.match(production.headers.getSetCookie()[0], /Secure/);
    const alias = await begin("google", "https://first-friend.vercel.app");
    assert.equal(new URL(alias.headers.get("location")).origin, "https://www.firstfriend.me");
    assert.equal((await begin("constructor")).status, 404);
    assert.equal((await begin("google", "https://evil.example")).status, 400);
  });
  await t.test("rejects forged state, malformed cookies and external return destinations", async () => {
    for (const value of ["//evil.example", "/\\evil.example", "/\n/evil.example", "https://evil.example"]) assert.equal(safeReturnTo(value), "/mypage");
    assert.equal(safeReturnTo("/mypage/favorites?x=1"), "/mypage/favorites?x=1");
    const before = fetches;
    const bad = await callback(new Request("http://localhost:3000/api/auth/oauth/google/callback?state=forged&code=x", { headers: { cookie: "ff_oauth_google_state=%broken" } }), context("google"));
    assert.equal(new URL(bad.headers.get("location")).searchParams.get("oauth"), "state");
    assert.equal(fetches, before);
  });
  await t.test("cancellation and provider failures preserve destination without a session", async () => {
    for (const mode of ["cancelled", "token", "network"]) {
      failure = mode;
      const result = await finish("google", await begin("google"), mode === "cancelled" ? "error=access_denied" : "code=x");
      assert.equal(new URL(result.headers.get("location")).pathname, "/login");
      assert.equal(new URL(result.headers.get("location")).searchParams.get("return_to"), "/mypage/favorites?from=login");
      assert.ok(result.headers.getSetCookie().every(value => /Max-Age=0/.test(value)));
    }
    failure = "";
  });
  await t.test("creates and restores Google, Kakao and Naver accounts including absent optional fields", async () => {
    for (const [provider, data] of [["google", { sub: "google-1", email: "same@example.test", email_verified: true, name: "Google member" }], ["kakao", { id: 12345 }], ["naver", { resultcode: "00", response: { id: "naver-1", email: "same@example.test" } }]]) {
      profile = data;
      const result = await finish(provider, await begin(provider));
      assert.equal(result.headers.get("location"), "http://localhost:3000/mypage/favorites?from=login");
      const sessionCookie = result.headers.getSetCookie().find(value => value.startsWith("ff_session="));
      assert.ok(sessionCookie);
      const token = sessionCookie.split(";")[0].slice("ff_session=".length);
      const beforeLookup = fetches;
      const member = await memberFromSession(undefined, token);
      assert.equal(fetches - beforeLookup, 1, "Session and member must be checked in one database request");
      assert.ok(member?.id);
      if (provider === "kakao") { assert.equal(member.email, ""); assert.equal(member.displayName, "퍼스트프렌드 회원"); }
      const memberCount = db.members.length;
      await finish(provider, await begin(provider));
      assert.equal(db.members.length, memberCount, "Repeat login must preserve the member ID and related data");
      await logout(new Request("http://localhost:3000/api/auth/logout", { headers: { cookie: `ff_session=${token}` } }));
      assert.equal(await memberFromSession(undefined, token), null);
    }
    assert.equal(db.members.length, 3, "Same email across providers must not merge accounts");
    assert.notEqual(db.auth_accounts[0].member_id, db.auth_accounts[2].member_id);
    assert.ok(db.auth_accounts[0].email_verified);
    assert.equal(db.auth_accounts[2].email_verified, false);
  });
  await t.test("expired sessions cannot restore an account", async () => {
    profile = { sub: "google-1" };
    const result = await finish("google", await begin("google"));
    const token = result.headers.getSetCookie().find(value => value.startsWith("ff_session=")).split(";")[0].slice("ff_session=".length);
    db.auth_sessions.at(-1).expires_at = "2000-01-01T00:00:00.000Z";
    assert.equal(await memberFromSession(undefined, token), null);
  });
  await t.test("invalid profiles and failed account writes do not create login sessions", async () => {
    const before = db.auth_sessions.length;
    profile = { sub: null };
    await finish("google", await begin("google"));
    assert.equal(db.auth_sessions.length, before);
    profile = { sub: "new-google" };
    failure = "account";
    const membersBefore = db.members.length;
    await finish("google", await begin("google"));
    assert.equal(db.members.length, membersBefore);
    assert.equal(db.auth_sessions.length, before);
    failure = "";
    db.members[0].sanctioned = true;
    profile = { sub: "google-1" };
    await finish("google", await begin("google"));
    assert.equal(db.auth_sessions.length, before);
  });
});
