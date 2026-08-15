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
  const homeFeedSource = await readFile(new URL("../app/components/HomeAnimalFeed.tsx", import.meta.url), "utf8");
  assert.match(homeFeedSource, /ff-home-feed-(?:head|summary)/);
  assert.match(homeFeedSource, /AnimalFilterBar/);
  assert.match(html, /다른 방법으로 친구 찾기/);
  assert.match(html, /data-seed/);
  assert.match(html, /ff-animal-filter-chip/);
  assert.doesNotMatch(
    html,
    /codex-preview|Your site is taking shape|react-loading-skeleton/i,
  );
  assert.match(html, /og\.png/);
});

test("keeps shelter animal cards identical to the home feed without clipping text", async () => {
  const css = await readFile(new URL("../app/globals.css", import.meta.url), "utf8");
  assert.doesNotMatch(css, /\.ff-shelter-channel-page \.ff-animal-card-row \.ff-animal-name/);
  assert.match(css, /\.ff-animal-card-row \.ff-animal-row-info \{ min-height: 126px; display: flex; flex-direction: column;/);
  assert.doesNotMatch(css, /grid-template-rows: 18px 27px 23px 18px 22px/);
  assert.match(css, /\.ff-animal-row-info \.ff-animal-name \{[^}]*height: auto;/);
});

test("wraps shelter info icon-only actions with the required SEED Icon component", async () => {
  const source = await readFile(new URL("../app/components/ShelterInfoValue.tsx", import.meta.url), "utf8");
  assert.match(source, /layout="iconOnly"[\s\S]*<Icon svg=\{expanded \?/);
  assert.match(source, /layout="iconOnly"[\s\S]*<Icon svg=\{<IconSquare2StackedLine\/>\}/);
  assert.doesNotMatch(source, /layout="iconOnly"[^>]*>[\s\S]{0,80}<IconSquare2StackedLine aria-hidden/);
});

test("keeps every requested home search journey in the floating search menu", async () => {
  const source = await readFile(new URL("../app/components/HomeSearchFab.tsx", import.meta.url), "utf8");
  for (const path of ["/find/conditions", "/find/draw", "/find/photo", "/find/worldcup", "/drawings"])
    assert.match(source, new RegExp(path.replaceAll("/", "\\/")));
});

test("keeps notifications before the rightmost home menu", async () => {
  const source = await readFile(new URL("../app/components/HomeTopbar.tsx", import.meta.url), "utf8");
  const actions = source.slice(source.indexOf('<div className="ff-top-actions">'));
  assert.ok(actions.indexOf('<NotificationBell home />') < actions.indexOf('<GlobalMenuButton />'));
  const notificationBell = await readFile(new URL("../app/components/NotificationBell.tsx", import.meta.url), "utf8");
  assert.match(notificationBell, /ff-home-notification/);
  assert.match(notificationBell, /unread > 99 \? "99\+" : unread/);
  assert.match(notificationBell, /notifications\/summary/);
});

test("uses consistent main and stacked app topbars", async () => {
  const source = await readFile(new URL("../app/components/AppChrome.tsx", import.meta.url), "utf8");
  assert.match(source, /function MainTopbar/);
  assert.match(source, /function StackTopbar/);
  assert.match(source, /ff-topbar-title/);
  assert.match(source, /<NotificationBell\/><GlobalMenuButton\/>/);
  assert.doesNotMatch(source, /ff-promise-link/);
});

test("uses a contextual animal detail topbar", async () => {
  const [chrome, bridge, page] = await Promise.all([
    readFile(new URL("../app/components/AppChrome.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/components/AnimalDetailChromeBridge.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/friends/[id]/page.tsx", import.meta.url), "utf8"),
  ]);
  assert.match(chrome, /title:"친구 정보",topbarTitle:""/);
  assert.match(bridge, /getBoundingClientRect\(\)\.bottom <= 56/);
  assert.match(bridge, /NotificationBell/);
  assert.match(bridge, /GlobalMenuButton/);
  assert.doesNotMatch(bridge, /FavoriteButton/);
  assert.doesNotMatch(bridge, /IconAndroidshareLine/);
  assert.match(page, /AnimalDetailChromeBridge/);
  assert.match(page, /shelterHref = animal\.shelterId/);
  assert.match(page, /ff-detail-shelter-link/);
  assert.match(page, /\/shelters\/\$\{encodeURIComponent\(animal\.shelterId\)\}/);
});

test("links the bottom navigation to saved friends", async () => {
  const source = await readFile(new URL("../app/components/BottomNav.tsx", import.meta.url), "utf8");
  assert.match(source, /href:"\/mypage\/favorites",label:"관심 친구"/);
  assert.match(source, /IconBookmarkLine/);
  assert.match(source, /activeHref/);
  assert.doesNotMatch(source, /label:"친구 찾기"/);
});

test("keeps favorite add, restore, and removal consistent", async () => {
  const [button, grid, api, detail, detailChrome] = await Promise.all([
    readFile(new URL("../app/components/FavoriteButton.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/components/FavoriteAnimalGrid.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/api/favorites/route.ts", import.meta.url), "utf8"),
    readFile(new URL("../app/friends/[id]/page.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/components/AnimalDetailChromeBridge.tsx", import.meta.url), "utf8"),
  ]);
  assert.match(button, /aria-busy=\{hydrating \|\| busy\}/);
  assert.match(button, /onFavoriteChange\?\.\(next\)/);
  assert.match(grid, /current\.filter\(item => item\.id !== animal\.id\)/);
  assert.match(api, /getAnimalById\(animalId\)/);
  assert.match(api, /현재 확인할 수 없는 동물이에요/);
  assert.match(api, /if \(!animalId\)[^;]+status: 400/);
  assert.match(detail, /AnimalDetailChromeBridge/);
  assert.match(detailChrome, /<NotificationBell \/>/);
  assert.match(detailChrome, /<GlobalMenuButton \/>/);
});

test("keeps Kakao test login local-only and issues a real member session", async () => {
  const source = await readFile(new URL("../app/api/auth/oauth/[provider]/route.ts", import.meta.url), "utf8");
  assert.match(source, /provider === "kakao" && isLocalRequest\(request\)/);
  assert.match(source, /findOrCreateSocialMember/);
  assert.match(source, /createSession/);
  assert.match(source, /first-friend-local-kakao-member/);
});

test("replaces species tabs with actionable shelter-distance animal filters", async () => {
  const [homeFeed, nearbyFeed, filters, api, store] = await Promise.all([
    readFile(new URL("../app/components/HomeAnimalFeed.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/components/NearbyAnimalFeed.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/components/AnimalFilterBar.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/api/animals/route.ts", import.meta.url), "utf8"),
    readFile(new URL("../lib/public-animal-store.ts", import.meta.url), "utf8"),
  ]);
  assert.doesNotMatch(homeFeed, /speciesOptions|Chip\.RadioRoot/);
  assert.doesNotMatch(nearbyFeed, /const options|Chip\.RadioRoot/);
  assert.match(filters, /import \{ Chip \} from "seed-design\/ui\/chip"/);
  assert.match(filters, /<Chip\.Button/);
  assert.match(filters, /<Chip\.Label/);
  assert.match(filters, /<Chip\.SuffixIcon/);
  assert.match(filters, /<Icon svg=\{<IconChevronDownLine \/>\}/);
  assert.match(filters, /data-checked=\{active \|\| undefined\}/);
  assert.match(filters, /variant="outlineWeak"/);
  assert.doesNotMatch(filters, /<button[^>]+className="ff-animal-filter-chip"/);
  assert.doesNotMatch(filters, /ff-filter-options/);
  const allFilters = await readFile(new URL("../app/components/AllAnimalFilters.tsx", import.meta.url), "utf8");
  for (const label of ["가까운 순", "보호 단계"]) assert.match(filters, new RegExp(label));
  assert.match(allFilters, /종류 · 품종/);
  assert.match(allFilters, /ff-filter-species-card/);
  assert.doesNotMatch(filters, /UnifiedFilterSheet|previewTotal/);
  assert.match(filters, /SimpleOptionSheet/);
  assert.doesNotMatch(filters, /distanceLabel|title="보호소까지 거리"/);
  assert.doesNotMatch(filters, /sizeLabel|title="크기"/);
  assert.doesNotMatch(filters, /ageLabel|title="나이"/);
  assert.match(allFilters, /품종을 검색해보세요/);
  assert.doesNotMatch(filters, /상세 조건|multiplePhotos|exactLocation/);
  for (const parameter of ["maxDistance", "breedKeys", "sizeGroup"]) { assert.match(api, new RegExp(parameter === "sizeGroup" ? "size" : parameter === "breedKeys" ? "breeds" : parameter)); assert.match(store, new RegExp(parameter)); }
  assert.match(allFilters, /seed-design\/ui\/checkbox/);
  assert.doesNotMatch(allFilters, /seed-design\/ui\/segmented-control/);
  for (const category of ["고양이", "강아지"]) assert.match(allFilters, new RegExp(category));
  assert.match(allFilters, /ff-filter-breed-toolbar/);
  assert.match(allFilters, /털색/);
  assert.match(allFilters, /중성화 완료/);
  assert.match(allFilters, /\["mature", "어른", "6~10살"\]/);
  assert.match(allFilters, /\["senior", "노령", "11살 이상"\]/);
  assert.match(allFilters, /\["xlarge", "초대형"\]/);
  assert.doesNotMatch(allFilters, /SnapRange|weightRange|<SectionHeading title="체중"/);
  assert.match(allFilters, /item\.count\.toLocaleString\("ko-KR"\)/);
  assert.match(allFilters, /마리<\/small>/);
  assert.match(store, /breedFilters\.has\(storedBreedKey\(row\)\)/);
  assert.match(store, /export async function getBreedCounts/);
  assert.doesNotMatch(store, /row\.breed\.toLocaleLowerCase/);
  assert.match(store, /return "나이 미상"/);
  assert.match(store, /function weightKg/);
  assert.match(store, /function sizeGroup/);
  assert.match(store, /ageGroupAliases/);
  assert.doesNotMatch(homeFeed, /현재 조건에 맞는 친구가 없어요/);
});

test("adds cached, deferred AI animal introductions without putting image bytes in storage", async () => {
  const [page, intro, api, worker, migration, env, vercel] = await Promise.all([
    readFile(new URL("../app/friends/[id]/page.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/components/AnimalAiIntro.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/api/animal-ai/route.ts", import.meta.url), "utf8"),
    readFile(new URL("../lib/animal-ai.ts", import.meta.url), "utf8"),
    readFile(new URL("../supabase/migrations/20260815000100_animal_ai_summaries.sql", import.meta.url), "utf8"),
    readFile(new URL("../.env.example", import.meta.url), "utf8"),
    readFile(new URL("../vercel.json", import.meta.url), "utf8"),
  ]);
  assert.match(page, /<AnimalAiIntro animalId=\{animal\.id\} \/>/);
  assert.match(page, /ff-detail-shelter[\s\S]*<AnimalAiIntro/);
  assert.match(intro, /AI가 발견한 이 친구의 매력/);
  assert.match(intro, /공개 정보와 사진을 바탕으로 작성한 참고용 소개/);
  assert.match(api, /enqueueAnimalAiSummary/);
  assert.match(worker, /createHash\("sha256"\)/);
  assert.match(worker, /MAX_IMAGE_BYTES/);
  assert.match(worker, /redirect: "error"/);
  assert.match(worker, /OPENAI_API_KEY/);
  assert.match(worker, /next_attempt_at/);
  assert.doesNotMatch(worker, /insert\([^)]*image/);
  for (const column of ["animal_id", "analysis_key", "generated_summary", "status", "model_version", "source_updated_at", "retry_count", "last_error"]) assert.match(migration, new RegExp(column));
  assert.match(env, /OPENAI_API_KEY=/);
  assert.match(env, /CRON_SECRET=/);
  assert.match(vercel, /\/api\/cron\/animal-ai/);
});

test("normalizes public API weight formats before assigning size groups", async () => {
  const migration = await readFile(new URL("../supabase/migrations/20260814000300_fix_public_animal_size_groups.sql", import.meta.url), "utf8");
  assert.match(migration, /regexp_replace\(coalesce\(traits_json, ''\)/);
  assert.match(migration, /regexp_replace\(coalesce\(traits_json, ''\),/);
  assert.match(migration, /parsed\.weight_kg < 3/);
  assert.match(migration, /parsed\.weight_kg < 5/);
  assert.match(migration, /unknown/);
});

test("accepts legacy age-group labels while the public data is normalized", async () => {
  const store = await readFile(new URL("../lib/public-animal-store.ts", import.meta.url), "utf8");
  assert.match(store, /"아기"/);
  assert.match(store, /"성장기"/);
});

test("uses the official public breed catalogue and stable breed codes", async () => {
  const [catalogue, route, schema, search, filter] = await Promise.all([
    readFile(new URL("../lib/public-breeds.ts", import.meta.url), "utf8"),
    readFile(new URL("../app/api/breeds/route.ts", import.meta.url), "utf8"),
    readFile(new URL("../db/schema.ts", import.meta.url), "utf8"),
    readFile(new URL("../lib/public-breed-search.ts", import.meta.url), "utf8"),
    readFile(new URL("../app/components/AllAnimalFilters.tsx", import.meta.url), "utf8"),
  ]);
  assert.match(catalogue, /abandonmentPublicService_v2\/kind_v2/);
  assert.match(catalogue, /up_kind_cd/);
  assert.match(catalogue, /417000/);
  assert.match(catalogue, /422400/);
  assert.match(route, /getPublicBreeds/);
  assert.match(route, /getBreedCounts/);
  assert.match(route, /countCache/);
  assert.match(schema, /upKindCd: text\("up_kind_cd"\)/);
  assert.match(schema, /kindCd: text\("kind_cd"\)/);
  assert.match(search, /진도개/);
  assert.match(search, /진도견/);
  assert.match(filter, /toLocaleLowerCase/);
});

test("keeps public sync jobs resumable and uses direct public API image URLs", async () => {
  const store = await readFile(new URL("../lib/public-animal-store.ts", import.meta.url), "utf8");
  const lostSync = store.slice(store.indexOf("async function syncPublicLostAnimalsUnlocked"), store.indexOf("function storedLostAnimal"));
  assert.match(lostSync, /nextPage/);
  assert.match(lostSync, /JSON\.parse\(String\(state\?\.message/);
  assert.match(lostSync, /const seenIds = new Set<string>\(\)/);
  assert.match(lostSync, /!seenIds\.has\(row\.id\)/);
  assert.doesNotMatch(store, /syncAnimalImages/);
  assert.doesNotMatch(store, /animal_image_jobs/);
  assert.doesNotMatch(store, /image_1_storage/);
});

test("keeps the nearby feed continuous without manual pagination copy", async () => {
  const nearby = await readFile(new URL("../app/components/NearbyAnimalFeed.tsx", import.meta.url), "utf8");
  assert.doesNotMatch(nearby, /친구 더 보기/);
  assert.doesNotMatch(nearby, /현재 확인 가능한 친구를 모두 봤어요/);
  assert.match(nearby, /IntersectionObserver/);
});

test("portals bottom sheets outside sticky navigation containers", async () => {
  const [source, css] = await Promise.all([
    readFile(new URL("../seed-design/ui/bottom-sheet.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/globals.css", import.meta.url), "utf8"),
  ]);
  assert.match(source, /@seed-design\/react-portal/);
  assert.match(source, /<Portal>/);
  assert.match(source, /<SeedBottomSheet\.Positioner/);
  assert.match(source, /scrollPosition/);
  assert.match(source, /requestAnimationFrame\(restoreScrollPosition\)/);
  assert.match(source, /insetInline: 0/);
  assert.match(source, /maxWidth: 520/);
  assert.match(source, /ff-bottom-sheet-content/);
  assert.match(css, /--ff-bottom-sheet-gutter:var\(--seed-dimension-x5\)/);
  assert.match(css, /seed-bottom-sheet__body\{--seed-box-padding-x-base:var\(--ff-bottom-sheet-gutter\)/);
  assert.match(css, /seed-bottom-sheet__footer\{gap:var\(--seed-dimension-x2\)/);
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

test("loads each shelter's animals by its public registration id", async () => {
  const [page, store, navigation, css] = await Promise.all([
    readFile(new URL("../app/shelters/[id]/page.tsx", import.meta.url), "utf8"),
    readFile(new URL("../lib/public-animal-store.ts", import.meta.url), "utf8"),
    readFile(new URL("../app/components/ShelterSectionNav.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/globals.css", import.meta.url), "utf8"),
  ]);
  assert.match(page, /getAnimalsByShelterId\(publicId\)/);
  assert.match(page, /layout="row"/);
  assert.match(page, /shelterAnimals\.total/);
  assert.match(store, /shelter_id.*shelterId|shelterId.*shelter_id/);
  assert.match(store, /active.*true/);
  assert.match(page, /IconClockLine[\s\S]*운영시간[\s\S]*IconPhoneLine[\s\S]*연락처/);
  assert.match(page, /ShelterSectionNav/);
  assert.match(page, /ShelterChannelActions/);
  assert.doesNotMatch(page, /ff-shelter-visit-list/);
  assert.doesNotMatch(page, /운영시간 보기/);
  assert.doesNotMatch(page, /ff-shelter-cover/);
  assert.ok(page.indexOf('id="shelter-animals"') < page.indexOf('id="shelter-updates"'));
  assert.match(navigation, /\?tab=\$\{value\}/);
  assert.match(navigation, /\["info", "정보"\],[\s\S]*\["updates", "소식"\],[\s\S]*\["support", "봉사·후원"\],[\s\S]*\["animals", "보호동물"\]/);
  assert.match(page, /\["info", "updates", "support", "animals"\][\s\S]*\|\| "info"/);
  assert.match(navigation, /aria-current/);
  assert.match(navigation, /NotificationBadge size="large"/);
  assert.doesNotMatch(navigation, /scrollIntoView/);
  assert.match(page, /visibleUpdates/);
  assert.match(css, /\.ff-shelter-profile h1[^}]*font-size: var\(--seed-font-size-t7\)[^}]*line-height: var\(--seed-line-height-t7\)[^}]*font-weight: var\(--seed-font-weight-bold\)/);
  assert.match(css, /\.ff-shelter-section-nav > a[^}]*font-size: var\(--seed-font-size-t5\)[^}]*line-height: var\(--seed-line-height-t5\)[^}]*font-weight: var\(--seed-font-weight-bold\)/);
  assert.match(css, /\.ff-shelter-info-board > div[^}]*font-size: var\(--seed-font-size-t4\)[^}]*line-height: var\(--seed-line-height-t4\)/);
  assert.match(page, /IconClockLine[\s\S]*운영시간[\s\S]*IconPhoneLine[\s\S]*연락처/);
  assert.match(page, /ShelterAddressRow address=\{shelter\.address\}/);
  assert.match(page, /ShelterInfoValue value=\{shelter\.phone\} copyLabel="연락처"/);
  assert.match(css, /\.ff-shelter-info-board svg[^}]*width: 18px[^}]*color: var\(--seed-color-fg-neutral-subtle\)/);
});

test("stores shelter follows and notifies followers about new updates", async () => {
  const [schema, follows, manage] = await Promise.all([
    readFile(new URL("../db/schema.ts", import.meta.url), "utf8"),
    readFile(new URL("../app/api/shelter-follows/route.ts", import.meta.url), "utf8"),
    readFile(new URL("../app/api/shelters/manage/route.ts", import.meta.url), "utf8"),
  ]);
  assert.match(schema, /shelter_follows/);
  assert.match(follows, /shelter_follows/);
  assert.match(manage, /type: "shelter_update"/);
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
    assert.match(source, /getChatGPTUser/);
  assert.match(reports, /reportCount/);
  assert.match(direct, /animal_media/);
  assert.match(lost, /reasons_json/);
  assert.match(operations, /guardian-confirm-handover/);
});

test("protects private mutation APIs at the source boundary", async () => {
  const files = await Promise.all(
    ["applications", "favorites", "uploads", "direct-animals"].map((name) =>
      readFile(new URL(`../app/api/${name}/route.ts`, import.meta.url), "utf8"),
    ),
  );
  for (const source of files) {
    assert.match(source, /getChatGPTUser/);
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
  assert.match(analyzer, /edgeDensity|eyeRatio|MobileCLIP/);
  assert.match(packageJson, /@huggingface\/transformers/);
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
    assert.match(source, /getChatGPTUser/);
    assert.match(source, /status:\s*401/);
  }
});

test("shows verified multi-photo counts on discovery thumbnails", async () => {
  const [findPage, card, favorite, publicData, publicStore, css] = await Promise.all([
    readFile(new URL("../app/find/page.tsx", import.meta.url), "utf8"),
    readFile(
      new URL("../app/components/AnimalCard.tsx", import.meta.url),
      "utf8",
    ),
    readFile(
      new URL("../app/components/FavoriteButton.tsx", import.meta.url),
      "utf8",
    ),
    readFile(new URL("../lib/public-data.ts", import.meta.url), "utf8"),
    readFile(new URL("../lib/public-animal-store.ts", import.meta.url), "utf8"),
    readFile(new URL("../app/globals.css", import.meta.url), "utf8"),
  ]);
  assert.match(findPage, /AnimalPage/);
  assert.match(findPage, /NearbyAnimalFeed initialPage/);
  assert.match(card, /IconPicture2StackedLine/);
  assert.match(card, /aria-label=\{`사진 \$\{animal\.photoCount\}장`\}/);
  assert.match(card, /ff-animal-row-location/);
  assert.match(card, /ff-animal-row-shelter/);
  assert.match(card, /ff-animal-grid-main/);
  assert.match(card, /ff-animal-grid-animal-link/);
  assert.match(card, /animal\.shelter/);
  assert.match(card, /\/shelters\/\$\{encodeURIComponent\(animal\.shelterId\)\}/);
  assert.match(card, /보호소 페이지 보기/);
  assert.match(publicData, /getShelters\(1000\)\)\.find/);
  assert.match(publicData, /from\("public_shelters"\)/);
  assert.match(publicData, /maybeSingle\(\)/);
  assert.match(card, /ff-animal-row-distance/);
  assert.match(card, /ff-animal-row-public-status/);
  assert.match(card, /getAnimalPublicStatus/);
  assert.match(favorite, /import \{ Bookmark \} from "lucide-react"/);
  assert.match(favorite, /fill=\{saved \? "currentColor" : "none"\}/);
  assert.match(favorite, /useState\(initialSaved \?\? false\)/);
  assert.match(favorite, /fetch\("\/api\/favorites"\)/);
  assert.match(favorite, /ids\.has\(animalId\)/);
  assert.match(favorite, /favoriteIdsRequest/);
  assert.match(favorite, /disabled=\{hydrating \|\| busy\}/);
  assert.doesNotMatch(favorite, /\.catch\(\(\) => new Set/);
  assert.match(favorite, /ff-card-scrap/);
  assert.match(css, /\.ff-animal-card-row \.ff-card-scrap \{[^}]*--seed-color-fg-placeholder/);
  assert.match(css, /\.ff-animal-card-row \.ff-card-scrap:hover \{ color: var\(--seed-color-fg-placeholder\)/);
  assert.match(css, /\.ff-card-scrap\[aria-pressed="true"\] \{ color: var\(--seed-color-fg-brand\); background: var\(--seed-color-bg-brand-weak\)/);
  assert.match(card, /formatDistance\(animal\.distanceMeters\)/);
  assert.match(card, /layout === "row"/);
  assert.match(publicData, /getAnimalsWithPhotoCounts/);
  assert.doesNotMatch(publicData, /distinctAnimalImages/);
  assert.match(publicStore, /photoCount: new Set\(images\)\.size/);
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
  assert.doesNotMatch(publicData, /distinctAnimalImages/);
  assert.match(gallery, /showModal\(\)/);
  assert.match(gallery, /onPointerDown/);
  assert.match(gallery, /onPointerMove/);
  assert.match(gallery, /onPointerUp/);
  assert.match(gallery, /translate3d/);
  assert.match(gallery, /좌우로 움직여/);
  assert.doesNotMatch(gallery, /새 탭에서 원본 열기/);
  assert.doesNotMatch(gallery, /사진 \{available\.length\}장/);
  assert.match(gallery, /\{selected \+ 1\}\/\{available\.length\}/);
  assert.match(detail, /AnimalGallery/);
});

test("explains public notice deadlines without presenting them as adoption deadlines", async () => {
  const [detail, status, actions, apply] = await Promise.all([
    readFile(new URL("../app/friends/[id]/page.tsx", import.meta.url), "utf8"),
    readFile(new URL("../lib/animal-public-status.ts", import.meta.url), "utf8"),
    readFile(new URL("../app/components/AnimalActions.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/apply/[id]/page.tsx", import.meta.url), "utf8"),
  ]);
  assert.match(detail, /getAnimalPublicStatus/);
  assert.match(status, /보호자 확인 공고 중/);
  assert.match(status, /잃어버린 동물일 수 있어 원래 보호자를 확인하고 있어요/);
  assert.match(status, /입양 상담 가능/);
  assert.match(status, /publicOutcomeLabel/);
  assert.match(status, /현재 처리 상태/);
  assert.match(status, /상담 이후 실제 입양 가능 여부와 절차는 보호소가 확인합니다/);
  assert.match(actions, /질문하기/);
  assert.match(actions, /연락하기/);
  assert.doesNotMatch(actions, /입양 신청/);
  assert.match(apply, /공공데이터만으로 입양 가능 여부를 확정할 수 없어요/);
  assert.doesNotMatch(apply, /ApplicationForm/);
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
  assert.match(compactOperations, /guardian_id/);
  assert.match(compactOperations, /action==="guardian-message"/);
  assert.match(compactOperations, /current\.guardian_id!==auth\.user\.userId/);
  assert.match(operations, /account-sanction-target/);
  assert.match(compactOperations, /member_id/);
  assert.match(application, /guardian_id:null/);
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
  assert.match(notifications, /alerts_enabled/);
  assert.match(shelter, /shelter_updates/);
  assert.match(shelter, /volunteer_posts/);
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
  assert.match(certification, /verification_code_hash/);
  assert.match(appeal, /sanction_appeals/);
  assert.match(appealUpload, /sanction-appeal/);
  assert.match(posts, /adoption_certifications/);
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
  assert.match(publicData, /reconfirmed_at/);
  assert.doesNotMatch(publicData, /item\.happenPlace \|\| item\.orgNm/);
  assert.match(migration, /CREATE TABLE `adoption_certifications`/);
  assert.match(migration, /CREATE TABLE `sanction_appeals`/);
  assert.match(tnr, /제주특별자치도/);
});

test("keeps draw, photo, and condition journeys independent while draw uses perfect-freehand controls", async () => {
  const [finder, drawPage, draw, photo, conditions] = await Promise.all([
    readFile(new URL("../app/components/Finder.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/find/draw/page.tsx", import.meta.url), "utf8"),
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
  assert.match(finder, /getStroke\(/);
  assert.match(finder, /ff-draw-species-panel|ff-canvas-panel/);
  for (const option of ["브러시 크기", "지우개 크기", "색상 선택", "그림 저장", "PNG 이미지", "JPG 이미지", "WEBP 이미지", "그림 공유"])
    assert.match(finder, new RegExp(option));
  assert.match(finder, /ff-modern-drawing-topbar/);
  assert.match(finder, /ff-drawing-guide-picker|그리기 가이드/);
  assert.match(finder, /강아지.*고양이|고양이.*강아지/);
  assert.match(finder, /되돌리기/);
  assert.match(finder, /다시 되돌리기/);
  assert.match(finder, /AI로 친구 찾기/);
  assert.match(finder, /지우기/);
  assert.match(finder, /특징을 분석해 친구 찾기/);
  assert.match(drawPage, /<Finder animals={await getAnimalsWithPhotoCounts\(30\)} modeOnly="draw"\/>/);
  assert.doesNotMatch(drawPage, /PerfectFreehandCanvas/);
  assert.match(await draw.text(), /마음속 친구를 그려보세요/);
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
  assert.match(sources[0], /HomeAnimalFeed/);
  assert.match(sources[29], /rows.*map[\s\S]*getAnimalById\(row\.animal_id\)/);
  assert.match(sources[29], /FavoriteAnimalGrid/);
  for (const source of sources.slice(1)) assert.match(source, /<h1/);
  const [chrome, css] = await Promise.all([
    readFile(new URL("../app/components/AppChrome.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/globals.css", import.meta.url), "utf8"),
  ]);
  assert.match(chrome, /ff-skip-link/);
  assert.match(chrome, /data-route-mode/);
  assert.match(chrome, /find\\\/worldcup/);
  assert.match(chrome, /window\.history\.back\(\)/);
  assert.match(chrome, /sessionStorage/);
  assert.match(chrome, /<button className="ff-app-back"/);
  assert.match(chrome, /window\.location\.assign\(fallback\)/);
  assert.match(css, /:focus-visible/);
  assert.match(css, /safe-area-inset-bottom/);
  assert.match(css, /@media \(max-width: 360px\)/);
});

test("adds Kakao vehicle travel time to the shelter distance summary without exposing the REST key", async () => {
  const [route, location, geo] = await Promise.all([
    readFile(new URL("../app/api/maps/directions/route.ts", import.meta.url), "utf8"),
    readFile(new URL("../app/components/ShelterLocationCard.tsx", import.meta.url), "utf8"),
    readFile(new URL("../lib/geo.ts", import.meta.url), "utf8"),
  ]);
  assert.match(route, /apis-navi\.kakaomobility\.com\/v1\/directions/);
  assert.match(route, /KAKAO_REST_API_KEY/);
  assert.match(route, /Authorization: `KakaoAK \$\{key\}`/);
  assert.match(route, /summary\?\.duration/);
  assert.doesNotMatch(location, /KAKAO_REST_API_KEY/);
  assert.match(location, /\/api\/maps\/directions/);
  assert.match(location, /차로 약/);
  assert.match(geo, /formatDrivingDuration/);
});

test("centers both Kakao map modes closely on the shelter without a fallback notice card", async () => {
  const [location, staticMap] = await Promise.all([
    readFile(new URL("../app/components/ShelterLocationCard.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/api/maps/static/route.ts", import.meta.url), "utf8"),
  ]);
  assert.match(location, /center: shelterPoint, level: 3/);
  assert.doesNotMatch(location, /현재는 카카오 정적 지도로 표시해요/);
  assert.doesNotMatch(location, /homeLat=|homeLng=/);
  assert.match(staticMap, /searchParams\.set\("center", `\$\{lng\},\$\{lat\}`\)/);
  assert.match(staticMap, /searchParams\.set\("lv", "3"\)/);
  assert.doesNotMatch(staticMap, /homeLat|homeLng/);
});

test("places the public-data badge beside the shelter name", async () => {
  const [page, css] = await Promise.all([
    readFile(new URL("../app/shelters/[id]/page.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/globals.css", import.meta.url), "utf8"),
  ]);
  assert.match(page, /ff-shelter-profile-heading[\s\S]*<h1>\{shelter\.name\}<\/h1>[\s\S]*ff-shelter-profile-badge/);
  assert.match(css, /\.ff-shelter-profile-heading \{[^}]*display: flex;[^}]*flex-wrap: wrap;/);
  assert.doesNotMatch(css, /ff-shelter-profile-badge \{[^}]*margin:/);
  const profileHeader = page.slice(page.indexOf('<header className="ff-shelter-profile">'), page.indexOf("<ShelterChannelActions"));
  assert.doesNotMatch(profileHeader, /shelter\.address|방문 전 전화 확인/);
});

test("keeps the shelter data notice readable at Korean word boundaries", async () => {
  const [page, css] = await Promise.all([
    readFile(new URL("../app/shelters/[id]/page.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/globals.css", import.meta.url), "utf8"),
  ]);
  assert.match(page, /공공데이터와 보호소 확인 정보를 함께 보여드려요/);
  assert.match(page, /방문 전 운영시간과 상담 가능 여부를 확인해 주세요/);
  assert.match(css, /\.ff-shelter-data-note \{[^}]*word-break: keep-all;[^}]*text-wrap: pretty;/);
  assert.match(css, /\.ff-shelter-data-note > span \{ display: block; \}/);
});

test("uses a compact SEED-scale shelter identity header after removing duplicate details", async () => {
  const [page, css] = await Promise.all([
    readFile(new URL("../app/shelters/[id]/page.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/globals.css", import.meta.url), "utf8"),
  ]);
  assert.match(page, /ff-shelter-profile-badge" size="medium"/);
  assert.match(css, /\.ff-shelter-profile \{[^}]*padding: 16px;/);
  assert.match(css, /\.ff-shelter-profile \.ff-shelter-avatar \{[^}]*width: 40px; height: 40px; border-radius: 12px;/);
  assert.match(css, /\.ff-shelter-profile \.ff-shelter-avatar svg \{ width: 20px; height: 20px; \}/);
  assert.match(css, /\.ff-shelter-profile h1 \{[^}]*font-size: var\(--seed-font-size-t7\);/);
});

test("shows interactive local-only dummy shelter updates, volunteering, and needs", async () => {
  const [page, demo, reaction, volunteer, support] = await Promise.all([
    readFile(new URL("../app/shelters/[id]/page.tsx", import.meta.url), "utf8"),
    readFile(new URL("../lib/shelter-demo.ts", import.meta.url), "utf8"),
    readFile(new URL("../app/components/ShelterReactionButton.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/components/VolunteerButton.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/components/SupportIntentButton.tsx", import.meta.url), "utf8"),
  ]);
  assert.match(page, /process\.env\.NODE_ENV !== "production" \? localShelterDemoContent/);
  assert.match(page, /demo=\{update\.id < 0\}/);
  assert.match(page, /demo=\{post\.id < 0\}/);
  assert.match(page, /demo=\{need\.id < 0\}/);
  assert.match(demo, /LOCAL DUMMY DATA/);
  assert.match(demo, /주말 보호실 청소/);
  assert.match(demo, /고양이 모래 6L/);
  for (const source of [reaction, volunteer, support]) assert.match(source, /if\(demo\)/);
});

test("uses distinct feed, recruitment, and delivery-progress patterns in shelter channels", async () => {
  const [page, css, support] = await Promise.all([
    readFile(new URL("../app/shelters/[id]/page.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/globals.css", import.meta.url), "utf8"),
    readFile(new URL("../app/components/SupportIntentButton.tsx", import.meta.url), "utf8"),
  ]);
  for (const className of ["ff-shelter-update-meta", "ff-shelter-volunteer-list", "ff-volunteer-facts", "ff-shelter-needs-list", "ff-need-progress"])
    assert.match(page, new RegExp(className));
  assert.match(page, /role="progressbar"/);
  assert.match(page, /label="도움 주기"/);
  assert.doesNotMatch(page, /<ListItem/);
  assert.match(css, /\.ff-shelter-help-group \+ \.ff-shelter-help-group[^}]*border-top: 8px solid/);
  assert.match(css, /\.ff-need-progress > span[^}]*background: var\(--seed-color-bg-brand-solid\)/);
  assert.match(support, /size\?:"small"\|"medium"/);
});
