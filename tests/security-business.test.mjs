import assert from "node:assert/strict";
import test from "node:test";
import { createServer } from "vite";

test("business APIs reject owner privilege escalation and surface database failures", async t => {
  const db = { members: [{ id: "owner", role: "shelter", verified: true }], direct_animals: [{ id: 1, member_id: "owner", status: "review" }], applications: [{ id: 2, member_id: "owner", animal_id: "direct-1", status: "completed" }], shelter_profiles: [], animal_name_suggestions: [{ id: 3, animal_id: "foreign-animal" }], public_animals: [{ id: "foreign-animal", shelter_id: "foreign-shelter" }], favorites: [] };
  let failTable = "", writes = 0;
  globalThis.__businessDb = { from(table) {
    let predicates = [], single = false, mutation;
    const q = { select() { return q; }, eq(k, v) { predicates.push(row => row[k] === v); return q; }, order() { return q; }, limit() { return q; },
      maybeSingle() { single = true; return q; }, single() { single = true; return q; },
      update(v) { mutation = v; return q; }, insert(v) { mutation = v; return q; }, upsert(v) { mutation = v; return q; }, delete() { mutation = {}; return q; },
      then(resolve, reject) { if (mutation) writes++; const rows = (db[table] || []).filter(row => predicates.every(p => p(row))); return Promise.resolve({ data: single ? rows[0] || null : rows, error: table === failTable ? { message: "fixture database unavailable" } : null }).then(resolve, reject); }
    }; return q;
  } };
  const server = await createServer({ configFile: false, envFile: false, appType: "custom", logLevel: "error", optimizeDeps: { noDiscovery: true, include: [] }, server: { middlewareMode: true, hmr: false }, plugins: [{ name: "business-auth", enforce: "pre", resolveId(s) { if (s.endsWith("chatgpt-auth")) return "\0business-auth"; if (s.endsWith("supabase/server")) return "\0business-db"; }, load(id) { if (id === "\0business-auth") return "export async function getChatGPTUser(){return {userId:'owner'}}"; if (id === "\0business-db") return "export function getSupabaseServerClient(){return globalThis.__businessDb}"; } }] });
  t.after(async () => { await server.close(); delete globalThis.__businessDb; });
  const req = body => new Request("https://firstfriend.test/api/test", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body) });
  const foster = await server.ssrLoadModule("/app/api/foster/manage/route.ts");
  assert.equal((await foster.POST(req({ id: 1, status: "published" }))).status, 409);
  assert.equal((await foster.POST(req({ id: 1, action: "reconfirm", status: "published" }))).status, 409);
  assert.equal((await foster.POST(req({ id: 2, action: "application-status", status: "approved" }))).status, 409);
  const shelters = await server.ssrLoadModule("/app/api/shelters/manage/route.ts");
  assert.equal((await shelters.POST(req({ action: "profile", publicId: "unowned-public-center", name: "claim", region: "서울", introduction: "소개 내용입니다 ".repeat(5) }))).status, 403);
  const community = await server.ssrLoadModule("/app/api/community/route.ts");
  assert.equal((await community.POST(req({ action: "name-select", suggestionId: 3 }))).status, 403);
  assert.equal((await community.POST(req({ action: "drawing-create", title: "사진", species: "cat", imageKey: "private-evidence/another-member/file.jpg" }))).status, 400);
  const application = await server.ssrLoadModule("/app/api/applications/[id]/route.ts");
  for (const action of ["withdraw", "handover", "confirm-handover"]) assert.ok((await application.POST(req({ action }), { params: Promise.resolve({ id: "2" }) })).status >= 400);
  assert.equal(writes, 0, "forbidden mutations must not reach writes");
  const favorites = await server.ssrLoadModule("/app/api/favorites/route.ts");
  failTable = "favorites";
  assert.equal((await favorites.GET()).status, 503);
  assert.equal((await favorites.DELETE(req({ animalId: "123" }))).status, 503);
  const reports = await server.ssrLoadModule("/app/api/reports/route.ts");
  db.posts = [{id:1,status:"published",hidden:false}];
  failTable = "reports";
  assert.equal((await reports.POST(req({ targetType: "post", targetId: "1", reason: "게시물 신고 사유입니다" }))).status, 503);
});
