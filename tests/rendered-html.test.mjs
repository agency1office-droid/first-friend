import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

async function render(path = "/") {
  const workerUrl = new URL("../dist/server/index.js", import.meta.url);
  workerUrl.searchParams.set("test", `${process.pid}-${Date.now()}-${path}`);
  const { default: worker } = await import(workerUrl.href);
  return worker.fetch(new Request(`http://localhost${path}`, { headers: { accept: "text/html", host: "localhost" } }), { ASSETS: { fetch: async () => new Response("Not found", { status: 404 }) } }, { waitUntil() {}, passThroughOnException() {} });
}

test("server-renders the First Friend home experience", async () => {
  const response = await render();
  assert.equal(response.status, 200);
  const html = await response.text();
  assert.match(html, /퍼스트 프렌드/);
  assert.match(html, /마음속 친구를/);
  assert.match(html, /그려서 찾기/);
  assert.match(html, /오늘 등록된 보호동물/);
  assert.match(html, /국가동물보호정보시스템/);
  assert.match(html, /data-seed/);
  assert.match(html, /seed-action-button/);
  assert.doesNotMatch(html, /codex-preview|Your site is taking shape|react-loading-skeleton/i);
  assert.match(html, /og\.png/);
});

test("renders public lost-animal and shelter surfaces", async () => {
  const [lost, shelters] = await Promise.all([render("/lost-found"), render("/shelters")]);
  assert.equal(lost.status, 200);
  assert.equal(shelters.status, 200);
  const lostHtml = await lost.text();
  const shelterHtml = await shelters.text();
  assert.match(lostHtml, /공공 분실동물 정보 연동/);
  assert.match(lostHtml, /최근 분실동물/);
  assert.match(lostHtml, /가까운 보호센터/);
  assert.match(shelterHtml, /동물보호센터 공공데이터/);
  assert.match(shelterHtml, /전국 보호센터/);
});

test("renders public discovery and safety principles", async () => {
  const [find, about] = await Promise.all([render("/find"), render("/about")]);
  assert.equal(find.status, 200);
  assert.equal(about.status, 200);
  const findHtml = await find.text();
  const aboutHtml = await about.text();
  assert.match(findHtml, /친구 찾기/);
  assert.match(findHtml, /AI는 외형의 유사성만 비교하며 건강·성격·입양 성공을 판단하지 않아요/);
  assert.match(aboutHtml, /생명을 점수로 평가하지 않아요/);
  assert.match(aboutHtml, /정확한 위치와 연락처를 보호해요/);
});

test("renders the complete adoption education and community journeys", async () => {
  const [guide, readiness, stories, foster] = await Promise.all([render("/guide"), render("/readiness"), render("/stories"), render("/foster")]);
  for (const response of [guide, readiness, stories, foster]) assert.equal(response.status, 200);
  assert.match(await guide.text(), /입양의 8단계/);
  assert.match(await readiness.text(), /입양 전 필수 과정/);
  assert.match(await stories.text(), /댓글과 별점 대신/);
  assert.match(await foster.text(), /본인 확인과 기본 교육/);
});

test("protects private mutation APIs at the source boundary", async () => {
  const files = await Promise.all(["applications", "favorites", "uploads", "direct-animals"].map(name => readFile(new URL(`../app/api/${name}/route.ts`, import.meta.url), "utf8")));
  for (const source of files) {
    assert.match(source, /authenticatedDb\(\)/);
    assert.match(source, /status:\s*401/);
  }
});

test("keeps durable bindings and generated migration", async () => {
  const [hosting, migration, packageJson, notices] = await Promise.all([
    readFile(new URL("../.openai/hosting.json", import.meta.url), "utf8"),
    readFile(new URL("../drizzle/0000_unique_rumiko_fujikawa.sql", import.meta.url), "utf8"),
    readFile(new URL("../package.json", import.meta.url), "utf8"),
    readFile(new URL("../THIRD_PARTY_NOTICES.md", import.meta.url), "utf8"),
  ]);
  assert.match(hosting, /"d1": "DB"/);
  assert.match(hosting, /"r2": "MEDIA"/);
  assert.match(migration, /CREATE TABLE `applications`/);
  assert.match(migration, /CREATE TABLE `lost_reports`/);
  const expandedMigration = await readFile(new URL("../drizzle/0001_overconfident_leo.sql", import.meta.url), "utf8");
  assert.match(expandedMigration, /CREATE TABLE `readiness_assessments`/);
  assert.match(expandedMigration, /CREATE TABLE `adoption_agreements`/);
  assert.match(expandedMigration, /CREATE TABLE `handover_reservations`/);
  assert.match(expandedMigration, /CREATE TABLE `direct_animals`/);
  assert.match(expandedMigration, /PRAGMA optimize/);
  assert.doesNotMatch(packageJson, /react-loading-skeleton/);
  assert.match(packageJson, /@seed-design\/react/);
  assert.match(packageJson, /@seed-design\/css/);
  assert.match(notices, /Apache License, Version 2\.0/);
});

test("implements on-device visual tags and explicit external dummies", async () => {
  const [finder, analyzer, integrations, migration, packageJson] = await Promise.all([
    readFile(new URL("../app/components/Finder.tsx", import.meta.url), "utf8"),
    readFile(new URL("../lib/visual-analysis.ts", import.meta.url), "utf8"),
    readFile(new URL("../lib/integrations.ts", import.meta.url), "utf8"),
    readFile(new URL("../drizzle/0002_eminent_mandroid.sql", import.meta.url), "utf8"),
    readFile(new URL("../package.json", import.meta.url), "utf8"),
  ]);
  assert.match(finder, /온디바이스 시각 분석/);
  assert.match(analyzer, /edgeDensity|eyeRatio|MobileNet/);
  assert.match(packageJson, /@tensorflow-models\/mobilenet/);
  assert.match(integrations, /DUMMY INTEGRATION/g);
  for (const table of ["saved_searches", "notifications", "verification_requests", "application_events", "return_requests", "moderation_actions"]) assert.match(migration, new RegExp("CREATE TABLE `" + table + "`"));
  assert.match(migration, /PRAGMA optimize/);
});

test("protects new operations, verification, alerts, and saved-search APIs", async () => {
  const files = await Promise.all(["operations", "verification", "notifications", "saved-searches"].map(name => readFile(new URL(`../app/api/${name}/route.ts`, import.meta.url), "utf8")));
  for (const source of files) {
    assert.match(source, /authenticatedDb\(\)/);
    assert.match(source, /status:\s*401/);
  }
});

test("preserves additional public animal photos and provides an original-size gallery", async () => {
  const [publicData, gallery, detail] = await Promise.all([
    readFile(new URL("../lib/public-data.ts", import.meta.url), "utf8"),
    readFile(new URL("../app/components/AnimalGallery.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/friends/[id]/page.tsx", import.meta.url), "utf8"),
  ]);
  assert.match(publicData, /popfile2/);
  assert.match(publicData, /images/);
  assert.match(gallery, /showModal\(\)/);
  assert.match(gallery, /새 탭에서 원본 열기/);
  assert.match(gallery, /aria-pressed/);
  assert.match(detail, /AnimalGallery/);
});
