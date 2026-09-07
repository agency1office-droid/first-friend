import assert from "node:assert/strict";
import test from "node:test";
import { createServer } from "vite";

test("admin publications reach public detail, stories and the correct application owner", async t => {
  const db = {
    direct_animals: [{ id: 7, member_id: "foster-owner", status: "published", name: "등록 친구", species: "강아지", region: "서울", rescue_story: "구조 이야기", health_json: "{}", life_json: "{}", updated_at: "2026-09-07" }],
    animal_media: [],
    posts: [{ id: 10, title: "운영자가 수정한 제목", body: "실제 게시물", status: "published", hidden: false, category: "neighborhood", created_at: "2026-09-07" }],
    post_reactions: [],
    readiness_assessments: [{ id: 1, member_id: "applicant", passed: true, readiness_score: 80, species: "dog" }],
    applications: [],
    shelter_profiles: [{ public_id: "shelter-1", verified: true, owner_id: "shelter-owner" }],
  };
  globalThis.__publicFlowDb = { from(table) {
    let filters = [], inserted, single = false;
    const query = {
      select() { return query; }, eq(key, value) { filters.push(row => row[key] === value); return query; },
      in(key, values) { filters.push(row => values.includes(row[key])); return query; },
      order() { return query; }, limit() { return query; }, range() { return query; },
      maybeSingle() { single = true; return query; }, single() { single = true; return query; },
      insert(value) { inserted = { id: 1, ...value }; db[table].push(inserted); return query; },
      then(resolve, reject) { const rows = inserted ? [inserted] : (db[table] || []).filter(row => filters.every(filter => filter(row))); return Promise.resolve({ data: single ? rows[0] || null : rows, error: null }).then(resolve, reject); },
    }; return query;
  } };
  globalThis.__publicFlowAnimals = [];
  const server = await createServer({ configFile: false, envFile: false, optimizeDeps: { noDiscovery: true, include: [] }, server: { middlewareMode: true, hmr: false }, appType: "custom", logLevel: "error", plugins: [{
    name: "public-flow-fixture", enforce: "pre",
    resolveId(source) {
      if (source.endsWith("supabase/server")) return "\0flow-db";
      if (source.endsWith("public-animal-store")) return "\0flow-animals";
      if (source.endsWith("chatgpt-auth")) return "\0flow-auth";
    },
    load(id) {
      if (id === "\0flow-db") return "export function getSupabaseServerClient(){return globalThis.__publicFlowDb;}";
      if (id === "\0flow-animals") return "export async function getStoredAnimalById(id){return globalThis.__publicFlowAnimals.find(row=>row.id===id)}; export async function getStoredLostAnimalById(){}; export async function getNearbyAnimalsPage(){return {items:globalThis.__publicFlowAnimals,nextCursor:null}};";
      if (id === "\0flow-auth") return "export async function getChatGPTUser(){return {userId:'applicant'}}";
    },
  }] });
  t.after(async () => { await server.close(); delete globalThis.__publicFlowDb; delete globalThis.__publicFlowAnimals; });
  const { getAnimalById, getAnimals } = await server.ssrLoadModule("/lib/public-data.ts");
  assert.equal((await getAnimalById("direct-7")).name, "등록 친구");
  assert.equal((await getAnimals())[0].id, "direct-7");
  db.direct_animals[0].status = "closed";
  assert.equal(await getAnimalById("direct-7"), undefined);
  assert.deepEqual(await getAnimals(), [], "empty DB must not resurrect external/dummy animals");
  db.direct_animals[0].status = "published";
  db.direct_animals[0].reconfirmed_at = "2020-01-01";
  assert.equal(await getAnimalById("direct-7"), undefined);
  delete db.direct_animals[0].reconfirmed_at;
  const { getStories } = await server.ssrLoadModule("/lib/stories.ts");
  assert.ok((await getStories()).some(row => row.id === "post-10"));
  db.posts[0].hidden = true;
  assert.ok(!(await getStories()).some(row => row.id === "post-10"));
  const { POST } = await server.ssrLoadModule("/app/api/applications/route.ts");
  const send = animalId => POST(new Request("https://firstfriend.test/api/applications", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ animalId, adopterAge: 30, household: "가족과 함께 돌봐요 ".repeat(5), carePlan: "산책과 식사를 챙겨요 ".repeat(5), absencePlan: "부재 시 가족이 돌봐요 ".repeat(3), emergencyPlan: "가까운 동물병원을 찾아요 ".repeat(3), agreementAccepted: true }) }));
  assert.equal((await send("missing-animal")).status, 404);
  assert.equal(db.applications.length, 0);
  assert.equal((await send("direct-7")).status, 201);
  assert.equal(db.applications.at(-1).guardian_id, "foster-owner");
  globalThis.__publicFlowAnimals = [{ id: "public-1", species: "강아지", traits: [], shelterId: "shelter-1" }];
  assert.equal((await send("public-1")).status, 201);
  assert.equal(db.applications.at(-1).guardian_id, "shelter-owner");
  assert.equal(db.applications.at(-1).shelter_public_id, "shelter-1");
});
