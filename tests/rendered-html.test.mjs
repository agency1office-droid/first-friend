import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

async function render(path = "/") {
  const workerUrl = new URL("../dist/server/index.js", import.meta.url);
  workerUrl.searchParams.set("test", `${process.pid}-${Date.now()}-${path}`);
  const { default: worker } = await import(workerUrl.href);
  return worker.fetch(
    new Request(`http://localhost${path}`, {
      headers: { accept: "text/html", host: "localhost" },
    }),
    {
      ASSETS: { fetch: async () => new Response("Not found", { status: 404 }) },
    },
    { waitUntil() {}, passThroughOnException() {} },
  );
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
  assert.doesNotMatch(
    html,
    /codex-preview|Your site is taking shape|react-loading-skeleton/i,
  );
  assert.match(html, /og\.png/);
});

test("renders public lost-animal and shelter surfaces", async () => {
  const [lost, shelters] = await Promise.all([
    render("/lost-found"),
    render("/shelters"),
  ]);
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
  assert.match(
    findHtml,
    /AI는 외형의 유사성만 비교하며 건강·성격·입양 성공을 판단하지 않아요/,
  );
  assert.match(aboutHtml, /생명을 점수로 평가하지 않아요/);
  assert.match(aboutHtml, /정확한 위치와 연락처를 보호해요/);
});

test("renders the complete adoption education and community journeys", async () => {
  const [guide, readiness, stories, foster] = await Promise.all([
    render("/guide"),
    render("/readiness"),
    render("/stories"),
    render("/foster"),
  ]);
  for (const response of [guide, readiness, stories, foster])
    assert.equal(response.status, 200);
  assert.match(await guide.text(), /입양의 8단계/);
  assert.match(await readiness.text(), /입양 전 필수 과정/);
  assert.match(await stories.text(), /댓글과 별점 대신/);
  assert.match(await foster.text(), /본인 확인과 기본 교육/);
});

test("renders independent matching, care cost, encyclopedia, TNR, and support journeys", async () => {
  const [draw, photo, conditions, prepare, encyclopedia, tnr, support] =
    await Promise.all([
      render("/find/draw"),
      render("/find/photo"),
      render("/find/conditions"),
      render("/prepare"),
      render("/encyclopedia"),
      render("/tnr"),
      render("/support"),
    ]);
  for (const response of [
    draw,
    photo,
    conditions,
    prepare,
    encyclopedia,
    tnr,
    support,
  ])
    assert.equal(response.status, 200);
  assert.match(await draw.text(), /마음속 친구를 그려보세요/);
  assert.match(await photo.text(), /업로드한 사진은 기기에서 특징만 분석/);
  assert.match(await conditions.text(), /품종·털색·나이·성별·지역/);
  assert.match(await prepare.text(), /월 생활비/);
  assert.match(await encyclopedia.text(), /반드시 감수하고 준비할 점/);
  assert.match(await tnr.text(), /개인 구조자 정보, 정확한 급식·포획 위치/);
  assert.match(
    await support.text(),
    /퍼스트 프렌드는 보험을 직접 판매하지 않습니다/,
  );
});

test("persists family, support, moderation, lost matching, and multi-media workflows", async () => {
  const [schema, family, support, lost, direct, reports, operations] =
    await Promise.all([
      readFile(new URL("../db/schema.ts", import.meta.url), "utf8"),
      readFile(new URL("../app/api/family/route.ts", import.meta.url), "utf8"),
      readFile(new URL("../app/api/support/route.ts", import.meta.url), "utf8"),
      readFile(
        new URL("../app/api/lost-found/route.ts", import.meta.url),
        "utf8",
      ),
      readFile(
        new URL("../app/api/direct-animals/route.ts", import.meta.url),
        "utf8",
      ),
      readFile(new URL("../app/api/reports/route.ts", import.meta.url), "utf8"),
      readFile(
        new URL("../app/api/operations/route.ts", import.meta.url),
        "utf8",
      ),
    ]);
  for (const name of [
    "familyRooms",
    "familyOpinions",
    "supportRecords",
    "lostMatches",
    "animalMedia",
    "adminAuditLogs",
    "accountSanctions",
  ])
    assert.match(schema, new RegExp(`export const ${name}`));
  for (const source of [family, support, lost, direct, operations])
    assert.match(source, /authenticatedDb\(\)/);
  assert.match(reports, /value>=50/);
  assert.match(direct, /animalMedia/);
  assert.match(lost, /reasonsJson/);
  assert.match(operations, /guardian-confirm-handover/);
});

test("protects private mutation APIs at the source boundary", async () => {
  const files = await Promise.all(
    ["applications", "favorites", "uploads", "direct-animals"].map((name) =>
      readFile(new URL(`../app/api/${name}/route.ts`, import.meta.url), "utf8"),
    ),
  );
  for (const source of files) {
    assert.match(source, /authenticatedDb\(\)/);
    assert.match(source, /status:\s*401/);
  }
});

test("keeps durable bindings and generated migration", async () => {
  const [hosting, migration, packageJson, notices] = await Promise.all([
    readFile(new URL("../.openai/hosting.json", import.meta.url), "utf8"),
    readFile(
      new URL("../drizzle/0000_unique_rumiko_fujikawa.sql", import.meta.url),
      "utf8",
    ),
    readFile(new URL("../package.json", import.meta.url), "utf8"),
    readFile(new URL("../THIRD_PARTY_NOTICES.md", import.meta.url), "utf8"),
  ]);
  assert.match(hosting, /"d1": "DB"/);
  assert.match(hosting, /"r2": "MEDIA"/);
  assert.match(migration, /CREATE TABLE `applications`/);
  assert.match(migration, /CREATE TABLE `lost_reports`/);
  const expandedMigration = await readFile(
    new URL("../drizzle/0001_overconfident_leo.sql", import.meta.url),
    "utf8",
  );
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
  const [finder, analyzer, integrations, migration, packageJson] =
    await Promise.all([
      readFile(
        new URL("../app/components/Finder.tsx", import.meta.url),
        "utf8",
      ),
      readFile(new URL("../lib/visual-analysis.ts", import.meta.url), "utf8"),
      readFile(new URL("../lib/integrations.ts", import.meta.url), "utf8"),
      readFile(
        new URL("../drizzle/0002_eminent_mandroid.sql", import.meta.url),
        "utf8",
      ),
      readFile(new URL("../package.json", import.meta.url), "utf8"),
    ]);
  assert.match(finder, /온디바이스 시각 분석/);
  assert.match(analyzer, /edgeDensity|eyeRatio|MobileNet/);
  assert.match(packageJson, /@tensorflow-models\/mobilenet/);
  assert.match(integrations, /DUMMY INTEGRATION/g);
  for (const table of [
    "saved_searches",
    "notifications",
    "verification_requests",
    "application_events",
    "return_requests",
    "moderation_actions",
  ])
    assert.match(migration, new RegExp("CREATE TABLE `" + table + "`"));
  assert.match(migration, /PRAGMA optimize/);
});

test("protects new operations, verification, alerts, and saved-search APIs", async () => {
  const files = await Promise.all(
    ["operations", "verification", "notifications", "saved-searches"].map(
      (name) =>
        readFile(
          new URL(`../app/api/${name}/route.ts`, import.meta.url),
          "utf8",
        ),
    ),
  );
  for (const source of files) {
    assert.match(source, /authenticatedDb\(\)/);
    assert.match(source, /status:\s*401/);
  }
});

test("shows verified multi-photo counts on discovery thumbnails", async () => {
  const [findPage, card, publicData] = await Promise.all([
    readFile(new URL("../app/find/page.tsx", import.meta.url), "utf8"),
    readFile(
      new URL("../app/components/AnimalCard.tsx", import.meta.url),
      "utf8",
    ),
    readFile(new URL("../lib/public-data.ts", import.meta.url), "utf8"),
  ]);
  assert.match(findPage, /getAnimalsWithPhotoCounts/);
  assert.match(card, /사진 \{animal\.photoCount\}장/);
  assert.match(publicData, /getAnimalsWithPhotoCounts/);
  assert.match(publicData, /distinctImages/);
});

test("preserves additional public animal photos and provides an original-size gallery", async () => {
  const [publicData, gallery, detail] = await Promise.all([
    readFile(new URL("../lib/public-data.ts", import.meta.url), "utf8"),
    readFile(
      new URL("../app/components/AnimalGallery.tsx", import.meta.url),
      "utf8",
    ),
    readFile(new URL("../app/friends/[id]/page.tsx", import.meta.url), "utf8"),
  ]);
  assert.match(publicData, /popfile2/);
  assert.match(publicData, /images/);
  assert.match(publicData, /crypto\.subtle\.digest\("SHA-256"/);
  assert.match(publicData, /distinctImages/);
  assert.match(gallery, /showModal\(\)/);
  assert.match(gallery, /새 탭에서 원본 열기/);
  assert.match(gallery, /aria-pressed/);
  assert.match(gallery, /사진 \{available\.length\}장/);
  assert.match(gallery, /\{index \+ 1\}\/\{available\.length\}/);
  assert.match(detail, /AnimalGallery/);
});

test("excludes closed public notices from adoption discovery", async () => {
  const source = await readFile(
    new URL("../lib/public-data.ts", import.meta.url),
    "utf8",
  );
  assert.match(source, /processState[\s\S]*startsWith\("종료"\)/);
});

test("enforces guardian ownership and correct moderation targets", async () => {
  const [operations, application, schema] = await Promise.all([
    readFile(
      new URL("../app/api/operations/route.ts", import.meta.url),
      "utf8",
    ),
    readFile(
      new URL("../app/api/applications/route.ts", import.meta.url),
      "utf8",
    ),
    readFile(new URL("../db/schema.ts", import.meta.url), "utf8"),
  ]);
  const compactOperations = operations.replace(/\s+/g, "");
  assert.doesNotMatch(
    operations,
    /demoApplications|demoVerifications|demoReports/,
  );
  assert.match(compactOperations, /eq\(applications\.guardianId,auth\.user\.userId\)/);
  assert.match(compactOperations, /action==="guardian-message"/);
  assert.match(compactOperations, /current\.guardianId!==auth\.user\.userId/);
  assert.match(operations, /account-sanction-target/);
  assert.match(compactOperations, /memberId=target\?\.memberId/);
  assert.match(application, /shelterProfile\?\.ownerId/);
  assert.match(schema, /guardianId:\s*text\("guardian_id"\)/);
});

test("connects saved-search alerts, real shelter updates, and visual lost matching", async () => {
  const [notifications, shelter, lostForm, lostApi] = await Promise.all([
    readFile(
      new URL("../app/api/notifications/route.ts", import.meta.url),
      "utf8",
    ),
    readFile(new URL("../app/shelters/[id]/page.tsx", import.meta.url), "utf8"),
    readFile(
      new URL("../app/components/LostFoundForm.tsx", import.meta.url),
      "utf8",
    ),
    readFile(
      new URL("../app/api/lost-found/route.ts", import.meta.url),
      "utf8",
    ),
  ]);
  assert.match(notifications, /saved_search_match/);
  assert.match(notifications, /searches\.filter\(row=>row\.alertsEnabled\)/);
  assert.match(shelter, /shelterUpdates/);
  assert.match(shelter, /volunteerPosts/);
  assert.doesNotMatch(shelter, /첫 번째 보호 일기|기본 봉사 공고/);
  assert.match(lostForm, /analyzeVisual/);
  assert.match(lostForm, /visualTags/);
  assert.match(lostApi, /data\.visualTags/);
});

test("implements external adoption proof, sanction appeal, and two-sided operator review", async () => {
  const [schema, certification, appeal, appealUpload, posts, operations] =
    await Promise.all([
      readFile(new URL("../db/schema.ts", import.meta.url), "utf8"),
      readFile(
        new URL("../app/api/adoption-certifications/route.ts", import.meta.url),
        "utf8",
      ),
      readFile(new URL("../app/api/appeals/route.ts", import.meta.url), "utf8"),
      readFile(
        new URL("../app/api/appeal-evidence/route.ts", import.meta.url),
        "utf8",
      ),
      readFile(new URL("../app/api/posts/route.ts", import.meta.url), "utf8"),
      readFile(
        new URL("../app/api/operations/route.ts", import.meta.url),
        "utf8",
      ),
    ]);
  for (const name of [
    "adoptionCertifications",
    "sanctionAppeals",
    "shelterUpdateReactions",
  ])
    assert.match(schema, new RegExp(`export const ${name}`));
  assert.match(certification, /verificationCodeHash/);
  assert.match(appeal, /status:"appealed"/);
  assert.match(appealUpload, /purpose: "sanction-appeal"/);
  assert.match(posts, /adoptionCertifications\.status,"verified"/);
  assert.match(operations, /adoption-certification-status/);
  assert.match(operations, /appeal-status/);
});

test("supports actionable foster and shelter management with stale-listing protection", async () => {
  const [foster, shelter, publicData, migration, tnr] = await Promise.all([
    readFile(
      new URL("../app/api/foster/manage/route.ts", import.meta.url),
      "utf8",
    ),
    readFile(
      new URL("../app/api/shelters/manage/route.ts", import.meta.url),
      "utf8",
    ),
    readFile(new URL("../lib/public-data.ts", import.meta.url), "utf8"),
    readFile(
      new URL("../drizzle/0006_robust_dagger.sql", import.meta.url),
      "utf8",
    ),
    readFile(new URL("../lib/care-content.ts", import.meta.url), "utf8"),
  ]);
  for (const action of ["application-status", "message", "reconfirm"])
    assert.match(foster, new RegExp(action));
  for (const action of ["volunteer-application-status", "need-received"])
    assert.match(shelter, new RegExp(action));
  assert.match(publicData, /reconfirmedAt/);
  assert.doesNotMatch(publicData, /item\.happenPlace \|\| item\.orgNm/);
  assert.match(migration, /CREATE TABLE `adoption_certifications`/);
  assert.match(migration, /CREATE TABLE `sanction_appeals`/);
  assert.match(tnr, /제주특별자치도/);
});

test("keeps draw, photo, and condition matching as independent non-tab journeys", async () => {
  const [finder, draw, photo, conditions] = await Promise.all([
    readFile(new URL("../app/components/Finder.tsx", import.meta.url), "utf8"),
    render("/find/draw"),
    render("/find/photo"),
    render("/find/conditions"),
  ]);
  for (const response of [draw, photo, conditions]) {
    assert.equal(response.status, 200);
    assert.doesNotMatch(
      await response.clone().text(),
      /role="tablist"|role="tabpanel"/,
    );
  }
  assert.doesNotMatch(finder, /TabsRoot|TabsContent|TabsTrigger/);
  assert.match(
    finder,
    /\{matched && <section className="ff-section" id="match-results">/,
  );
});

test("uses queued SEED snackbars for transient feedback across core actions", async () => {
  const [layout, feedback, favorite, application, operations] =
    await Promise.all([
      readFile(new URL("../app/layout.tsx", import.meta.url), "utf8"),
      readFile(
        new URL("../app/components/AppFeedback.tsx", import.meta.url),
        "utf8",
      ),
      readFile(
        new URL("../app/components/FavoriteButton.tsx", import.meta.url),
        "utf8",
      ),
      readFile(
        new URL("../app/components/ApplicationProgress.tsx", import.meta.url),
        "utf8",
      ),
      readFile(
        new URL("../app/components/OperationsConsole.tsx", import.meta.url),
        "utf8",
      ),
    ]);
  assert.match(layout, /AppFeedbackProvider/);
  assert.match(feedback, /SnackbarProvider strategy="queued"/);
  assert.match(feedback, /variant="positive"|variant: "positive"/);
  assert.match(feedback, /variant="critical"|variant: "critical"/);
  for (const source of [favorite, application, operations])
    assert.match(source, /useAppFeedback/);
});

test("adapts an accessible board-row information pattern without mixing design tokens", async () => {
  const [board, detail, prepare, draw, photo, conditions] = await Promise.all([
    readFile(
      new URL("../app/components/InfoBoard.tsx", import.meta.url),
      "utf8",
    ),
    readFile(new URL("../app/friends/[id]/page.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/prepare/page.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/find/draw/page.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/find/photo/page.tsx", import.meta.url), "utf8"),
    readFile(
      new URL("../app/find/conditions/page.tsx", import.meta.url),
      "utf8",
    ),
  ]);
  assert.match(board, /seed-design\/ui\/accordion/);
  assert.match(board, /AccordionTrigger/);
  assert.match(detail, /<InfoBoard/);
  assert.match(prepare, /<InfoBoard/);
  for (const source of [draw, photo, conditions])
    assert.doesNotMatch(source, /‹ 친구 찾기/);
  assert.doesNotMatch(detail, /ff-gallery-back/);
});

test("implements lifetime planning, human drawing matches, expert Q&A, transparent funding, and volunteer reputation", async () => {
  const [schema, community, care, drawings, worldcup, questions, volunteer] = await Promise.all([
    readFile(new URL("../db/schema.ts", import.meta.url), "utf8"),
    readFile(new URL("../app/api/community/route.ts", import.meta.url), "utf8"),
    readFile(new URL("../app/components/LifetimeCarePlanner.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/drawings/page.tsx", import.meta.url), "utf8"),
    render("/find/worldcup"),
    readFile(new URL("../app/questions/page.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/volunteer/page.tsx", import.meta.url), "utf8"),
  ]);
  for (const table of ["drawingPosts", "drawingMatches", "animalNameSuggestions", "communityQuestions", "fundraisers", "volunteerBadges"])
    assert.match(schema, new RegExp(`export const ${table}`));
  assert.match(community, /drawing-select/);
  assert.match(community, /name-select/);
  assert.match(community, /fundraiser-create/);
  assert.match(care, /함께할 가능성이 있어요/);
  assert.equal(worldcup.status, 200);
  assert.match(drawings, /DrawingBoard/);
  assert.match(await worldcup.text(), /이상형 월드컵/);
  assert.match(questions, /QABoard/);
  assert.match(volunteer, /청소/);
});

test("keeps all 36 product-review pages discoverable and under the shared app-quality system", async () => {
  const pages = [
    "app/page.tsx", "app/find/page.tsx", "app/friends/[id]/page.tsx", "app/apply/[id]/page.tsx",
    "app/readiness/page.tsx", "app/guide/page.tsx", "app/prepare/page.tsx", "app/find/conditions/page.tsx",
    "app/find/draw/page.tsx", "app/find/photo/page.tsx", "app/find/worldcup/page.tsx", "app/drawings/page.tsx",
    "app/shelters/page.tsx", "app/shelters/map/page.tsx", "app/shelters/manage/page.tsx", "app/volunteer/page.tsx",
    "app/verification/page.tsx", "app/operations/page.tsx", "app/encyclopedia/page.tsx", "app/questions/page.tsx",
    "app/stories/page.tsx", "app/stories/new/page.tsx", "app/support/page.tsx", "app/lost-found/page.tsx",
    "app/tnr/page.tsx", "app/foster/page.tsx", "app/adoption-verification/page.tsx", "app/appeal/page.tsx",
    "app/mypage/page.tsx", "app/mypage/favorites/page.tsx", "app/mypage/searches/page.tsx", "app/mypage/family/page.tsx",
    "app/mypage/messages/page.tsx", "app/mypage/reputation/page.tsx", "app/notifications/page.tsx", "app/login/page.tsx",
  ];
  assert.equal(pages.length, 36);
  const sources = await Promise.all(pages.map(path => readFile(new URL(`../${path}`, import.meta.url), "utf8")));
  for (const source of sources) assert.match(source, /<h1/);
  const [chrome, css] = await Promise.all([
    readFile(new URL("../app/components/AppChrome.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/globals.css", import.meta.url), "utf8"),
  ]);
  assert.match(chrome, /ff-skip-link/);
  assert.match(chrome, /data-route-mode/);
  assert.match(chrome, /find\\\/worldcup/);
  assert.match(css, /:focus-visible/);
  assert.match(css, /safe-area-inset-bottom/);
  assert.match(css, /@media \(max-width: 360px\)/);
});
