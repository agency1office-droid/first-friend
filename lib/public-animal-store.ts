import { and, count, desc, eq, ne, sql } from "drizzle-orm";
import { getDb } from "../db";
import { publicAnimals, publicShelters, publicSyncState } from "../db/schema";
import type { Animal } from "./data";
import { distanceMeters } from "./geo";
import { distinctAnimalImages } from "./animal-images";
import { matchesAnimalPublicStatus } from "./animal-public-status";

const ANIMAL_ENDPOINT = "https://apis.data.go.kr/1543061/abandonmentPublicService_v2/abandonmentPublic_v2";
const SHELTER_ENDPOINT = "https://apis.data.go.kr/1543061/animalShelterSrvc_v2/shelterInfo_v2";
const PAGE_SIZE = 1000;
const MAX_PAGES = 50;
const SYNC_INTERVAL_MS = 15 * 60 * 1000;

type Envelope<T> = { response?: { header?: { resultCode?: string; resultMsg?: string }; body?: { items?: { item?: T | T[] }; totalCount?: number | string } } };
type AnimalItem = { desertionNo?: string; happenDt?: string; kindFullNm?: string; upKindCd?: string; upKindNm?: string; kindCd?: string; kindNm?: string; colorCd?: string; age?: string; weight?: string; noticeNo?: string; noticeSdt?: string; noticeEdt?: string; popfile1?: string; popfile2?: string; processState?: string; sexCd?: string; neuterYn?: string; specialMark?: string; careRegNo?: string; careNm?: string; careTel?: string; careAddr?: string; orgNm?: string; updTm?: string };
type ShelterItem = { careRegNo?: string; careNm?: string; orgNm?: string; careAddr?: string; careTel?: string; weekOprStime?: string; weekOprEtime?: string; closeDay?: string; lat?: string; lng?: string };
type ShelterRecord = typeof publicShelters.$inferInsert;
type AnimalRecord = typeof publicAnimals.$inferInsert;
type StoredAnimal = typeof publicAnimals.$inferSelect;

export type AnimalPage = {
  items: Animal[];
  total: number;
  nextCursor: string | null;
  syncedAt: string | null;
  stale: boolean;
};

export type BreedCountOptions = {
  lat?: number;
  lng?: number;
  ageGroup?: string;
  sizeGroup?: string;
  sex?: string;
  publicStatus?: string;
  maxDistance?: number;
};

const regionCenters: Record<string, [number, number]> = {
  서울: [37.5665, 126.978], 부산: [35.1796, 129.0756], 대구: [35.8714, 128.6014], 인천: [37.4563, 126.7052], 광주: [35.1595, 126.8526], 대전: [36.3504, 127.3845], 울산: [35.5384, 129.3114], 세종: [36.4801, 127.289], 경기: [37.275, 127.009], 강원: [37.8854, 127.7298], 충북: [36.6357, 127.4917], 충남: [36.6588, 126.6728], 전북: [35.8202, 127.1089], 전남: [34.8161, 126.4629], 경북: [36.5759, 128.5056], 경남: [35.2383, 128.6924], 제주: [33.4996, 126.5312],
};

let runningSync: Promise<{ count: number; pages: number; syncedAt: string }> | null = null;

function apiKey() { return process.env.PUBLIC_DATA_API_KEY?.trim(); }
function array<T>(value: T | T[] | undefined) { return !value ? [] : Array.isArray(value) ? value : [value]; }
function secureImage(value = "") { return value.replace(/^http:\/\//, "https://"); }
function compactDate(value = "") { const digits = value.replace(/\D/g, "").slice(0, 8); return digits.length === 8 ? `${digits.slice(0, 4)}. ${Number(digits.slice(4, 6))}. ${Number(digits.slice(6, 8))}.` : value; }
function sex(value = "") { return value === "M" ? "수컷" : value === "F" ? "암컷" : "미상"; }
function species(item: AnimalItem) { return item.upKindNm || item.kindFullNm?.match(/^\[([^\]]+)/)?.[1] || "기타"; }
function supported(value: string) { return /고양이|개|강아지/.test(value) && !/기타/.test(value); }
function ageGroup(value = ""): Animal["ageGroup"] { if (value.includes("60일미만")) return "어린 친구"; const born = Number(value.match(/(19|20)\d{2}/)?.[0]); if (!born) return "나이 미상"; return new Date().getFullYear() - born <= 1 ? "어린 친구" : "어른 친구"; }
function displayName(item: AnimalItem) { return [item.kindNm || species(item), item.noticeNo?.split("-").at(-1)].filter(Boolean).join(" · "); }
function validPoint(lat: number, lng: number) { return Number.isFinite(lat) && Number.isFinite(lng) && lat > 30 && lat < 40 && lng > 120 && lng < 135; }
function jsonArray(value: string) { try { const result = JSON.parse(value); return Array.isArray(result) ? result.map(String) : []; } catch { return []; } }
function weightKg(row: StoredAnimal) { const value = jsonArray(row.traitsJson).find(item => /kg/i.test(item)); if (!value) return undefined; const values = [...value.matchAll(/\d+(?:\.\d+)?/g)].map(match => Number(match[0])).filter(number => number > 0 && number <= 150); return values.length ? values.reduce((sum, number) => sum + number, 0) / values.length : undefined; }
function sizeGroup(row: StoredAnimal) { const weight = weightKg(row); if (weight === undefined) return "unknown"; if (row.species === "고양이") return weight < 3 ? "small" : weight < 6 ? "medium" : "large"; return weight < 10 ? "small" : weight < 25 ? "medium" : "large"; }

const colorAliases: Record<string, string[]> = {
  // 공공 API의 colorCd는 보호소 자유입력값이라, 단일 색상뿐 아니라
  // 약칭(갈/흰), 조합(갈색&흰색), 기타(삼색)도 같은 색상 그룹으로 찾는다.
  "흰색": ["흰색", "흰", "백색", "백", "화이트", "하얀", "아이보리"],
  "검정": ["검정", "검은색", "검은", "검", "흑색", "흑", "블랙", "까만색"],
  "갈색": ["갈색", "갈색계열", "갈", "밤색", "브라운", "초콜릿", "쵸콜릿", "흑갈색", "황갈색", "금갈색", "연갈색", "암갈색", "갈백", "갈흑"],
  "황색": ["황색", "황색계열", "황토색", "황토", "노랑", "노란색", "옐로우", "레몬색", "크림색", "금색", "금갈색", "황갈색", "옅은 황색", "엷은 황갈색", "붉고 엷은 황갈색"],
  "회색": ["회색", "회", "그레이", "잿빛", "은색", "실버", "흰회", "회백", "회갈"],
  "삼색": ["삼색", "세가지색", "칼리코", "캘리코", "카오스", "기타(삼색)"],
  "고등어": ["고등어", "반고등어", "고등어태비", "태비", "테비", "줄무늬", "호랑이무늬", "호반색", "얼룩무늬", "기타(고등어)"],
  "치즈": ["치즈", "치즈색", "치즈태비", "치즈테비", "기타(치즈)"],
};

function matchesColorGroup(colorsJsonValue: string, color: string) {
  const aliases = colorAliases[color] || [color];
  return jsonArray(colorsJsonValue).some(value => aliases.some(alias => value.toLocaleLowerCase("ko-KR").includes(alias)));
}
function storedBreedKey(row: StoredAnimal) { const upKindCd = /^(417000|422400)$/.test(row.upKindCd) ? row.upKindCd : row.species === "고양이" ? "422400" : "417000"; const kindCd = /^\d{6}$/.test(row.kindCd) ? row.kindCd : "000000"; return `${upKindCd}:${kindCd}`; }
function chunks<T>(items: T[], size: number) { const result: T[][] = []; for (let index = 0; index < items.length; index += size) result.push(items.slice(index, index + size)); return result; }

async function addColumn(statement: string) {
  try { await getDb().run(sql.raw(statement)); return true; }
  catch (error) {
    const messages: string[] = [];
    let current: unknown = error;
    for (let depth = 0; current && depth < 5; depth += 1) {
      messages.push(current instanceof Error ? current.message : String(current));
      current = typeof current === "object" && "cause" in current ? (current as { cause?: unknown }).cause : undefined;
    }
    if (/duplicate column/i.test(messages.join("\n"))) return false;
    throw error;
  }
}

async function ensureTables() {
  const db = getDb();
  await db.run(sql.raw(`CREATE TABLE IF NOT EXISTS public_shelters (
    id text PRIMARY KEY NOT NULL, name text NOT NULL, organization text DEFAULT '' NOT NULL,
    address text DEFAULT '' NOT NULL, phone text DEFAULT '' NOT NULL, hours text DEFAULT '' NOT NULL,
    closed text DEFAULT '' NOT NULL, lat real, lng real, approximate_location integer DEFAULT false NOT NULL,
    synced_at text NOT NULL
  )`));
  await db.run(sql.raw("CREATE INDEX IF NOT EXISTS idx_public_shelters_name ON public_shelters (name)"));
  await db.run(sql.raw(`CREATE TABLE IF NOT EXISTS public_animals (
    id text PRIMARY KEY NOT NULL, name text NOT NULL, species text NOT NULL, breed text NOT NULL,
    up_kind_cd text DEFAULT '' NOT NULL, kind_cd text DEFAULT '' NOT NULL,
    age text NOT NULL, age_group text NOT NULL, sex text NOT NULL, region text NOT NULL,
    shelter_id text, shelter_name text NOT NULL, shelter_address text DEFAULT '' NOT NULL,
    shelter_phone text DEFAULT '' NOT NULL, shelter_lat real, shelter_lng real,
    approximate_shelter_location integer DEFAULT false NOT NULL, updated text NOT NULL,
    image_1 text NOT NULL, image_2 text DEFAULT '' NOT NULL, colors_json text DEFAULT '[]' NOT NULL,
    traits_json text DEFAULT '[]' NOT NULL, summary text NOT NULL, health_json text DEFAULT '[]' NOT NULL,
    life_json text DEFAULT '[]' NOT NULL, match_reason text NOT NULL, process_state text DEFAULT '' NOT NULL,
    active integer DEFAULT true NOT NULL, last_seen_sync text NOT NULL, synced_at text NOT NULL
  )`));
  const addedUpKind = await addColumn("ALTER TABLE public_animals ADD COLUMN up_kind_cd text DEFAULT '' NOT NULL");
  const addedKind = await addColumn("ALTER TABLE public_animals ADD COLUMN kind_cd text DEFAULT '' NOT NULL");
  await db.run(sql.raw("CREATE INDEX IF NOT EXISTS idx_public_animals_active_updated ON public_animals (active, updated)"));
  await db.run(sql.raw("CREATE INDEX IF NOT EXISTS idx_public_animals_species_active ON public_animals (species, active)"));
  await db.run(sql.raw("CREATE INDEX IF NOT EXISTS idx_public_animals_kind_active ON public_animals (up_kind_cd, kind_cd, active)"));
  await db.run(sql.raw("CREATE INDEX IF NOT EXISTS idx_public_animals_shelter ON public_animals (shelter_id)"));
  await db.run(sql.raw(`CREATE TABLE IF NOT EXISTS public_sync_state (
    id text PRIMARY KEY NOT NULL, status text NOT NULL, last_started_at text NOT NULL,
    last_completed_at text, item_count integer DEFAULT 0 NOT NULL, page_count integer DEFAULT 0 NOT NULL,
    message text DEFAULT '' NOT NULL
  )`));
  return addedUpKind || addedKind;
}

async function fetchPage<T>(endpoint: string, pageNo: number, numOfRows: number) {
  const key = apiKey();
  if (!key) throw new Error("PUBLIC_DATA_API_KEY가 설정되지 않았습니다.");
  const url = new URL(endpoint);
  url.searchParams.set("serviceKey", key);
  url.searchParams.set("pageNo", String(pageNo));
  url.searchParams.set("numOfRows", String(numOfRows));
  url.searchParams.set("_type", "json");
  const response = await fetch(url, { cache: "no-store", signal: AbortSignal.timeout(15000) });
  if (!response.ok) throw new Error(`공공데이터 API 응답 오류 ${response.status}`);
  const payload = await response.json() as Envelope<T>;
  if (payload.response?.header?.resultCode !== "00") throw new Error(payload.response?.header?.resultMsg || "공공데이터 API 오류");
  return { items: array(payload.response.body?.items?.item), total: Number(payload.response.body?.totalCount || 0) };
}

async function fetchAll<T>(endpoint: string) {
  const items: T[] = [];
  let page = 1, total = Infinity;
  while (page <= MAX_PAGES && items.length < total) {
    const result = await fetchPage<T>(endpoint, page, PAGE_SIZE);
    items.push(...result.items);
    total = result.total || (result.items.length < PAGE_SIZE ? items.length : Infinity);
    if (!result.items.length || result.items.length < PAGE_SIZE) break;
    page += 1;
  }
  return { items, pages: page };
}

function mapShelter(item: ShelterItem, syncedAt: string): ShelterRecord | null {
  if (!item.careRegNo && !item.careNm) return null;
  const rawLat = Number(item.lat), rawLng = Number(item.lng), exact = validPoint(rawLat, rawLng);
  const region = Object.keys(regionCenters).find(name => `${item.orgNm || ""} ${item.careAddr || ""}`.includes(name));
  const fallback = region ? regionCenters[region] : undefined;
  return {
    id: item.careRegNo || `name:${item.careNm}`,
    name: item.careNm || "동물보호센터",
    organization: item.orgNm || "",
    address: item.careAddr || "",
    phone: item.careTel || "",
    hours: item.weekOprStime && item.weekOprEtime ? `${item.weekOprStime} ~ ${item.weekOprEtime}` : "",
    closed: item.closeDay && item.closeDay !== "0" ? item.closeDay : "",
    lat: exact ? rawLat : fallback?.[0],
    lng: exact ? rawLng : fallback?.[1],
    approximateLocation: !exact,
    syncedAt,
  };
}

function mapAnimal(item: AnimalItem, shelterMap: Map<string, ShelterRecord>, syncId: string, syncedAt: string): AnimalRecord | null {
  const animalSpecies = species(item), state = item.processState || "공고중";
  if (!item.desertionNo || !item.popfile1 || !supported(animalSpecies) || state.trim().startsWith("종료")) return null;
  const shelter = (item.careRegNo && shelterMap.get(item.careRegNo)) || [...shelterMap.values()].find(row => row.name === item.careNm);
  const colors = item.colorCd?.split(/[,&+·]/).map(value => value.trim()).filter(Boolean) || [];
  const notice = item.noticeSdt && item.noticeEdt ? `공고 ${compactDate(item.noticeSdt)} ~ ${compactDate(item.noticeEdt)}` : "공고 기간은 상세 상담에서 확인해 주세요";
  return {
    id: item.desertionNo,
    name: displayName(item),
    species: animalSpecies.includes("고양이") ? "고양이" : "강아지",
    breed: item.kindNm || "품종 미상",
    upKindCd: item.upKindCd || (animalSpecies.includes("고양이") ? "422400" : "417000"),
    kindCd: /^\d{6}$/.test(item.kindCd || "") ? item.kindCd : "000000",
    age: item.age || "나이 미상",
    ageGroup: ageGroup(item.age),
    sex: sex(item.sexCd),
    region: item.orgNm || "지역 확인 중",
    shelterId: shelter?.id || item.careRegNo,
    shelterName: shelter?.name || item.careNm || "관할 보호센터",
    shelterAddress: shelter?.address || item.careAddr || "",
    shelterPhone: shelter?.phone || item.careTel || "",
    shelterLat: shelter?.lat,
    shelterLng: shelter?.lng,
    approximateShelterLocation: shelter?.approximateLocation ?? true,
    updated: compactDate(item.updTm || item.happenDt),
    image1: secureImage(item.popfile1),
    image2: secureImage(item.popfile2),
    colorsJson: JSON.stringify(colors),
    traitsJson: JSON.stringify([item.colorCd, item.weight, state].filter(Boolean).slice(0, 3)),
    summary: item.specialMark?.trim() || `${(item.orgNm || "관할 지역").split(" ").slice(0, 2).join(" ")}에서 구조되어 보호 중인 ${animalSpecies}입니다. 정확한 구조 위치는 공개하지 않아요.`,
    healthJson: JSON.stringify([item.weight ? `공개 체중 ${item.weight}` : "체중 정보 없음", item.neuterYn === "Y" ? "중성화 완료로 등록됨" : item.neuterYn === "N" ? "중성화되지 않은 것으로 등록됨" : "중성화 여부 미상", `현재 상태: ${state}`]),
    lifeJson: JSON.stringify([notice, `발견 지역: ${(item.orgNm || "관할 지역").split(" ").slice(0, 2).join(" ")} 인근 · 정확한 구조 위치 비공개`, "성격과 건강 상태는 보호센터 상담을 통해 확인해 주세요"]),
    matchReason: `${item.colorCd || "등록된 털색"}과 ${item.kindNm || animalSpecies} 외형을 중심으로 비교했어요.`,
    processState: state,
    active: true,
    lastSeenSync: syncId,
    syncedAt,
  };
}

async function writeShelters(rows: ShelterRecord[]) {
  const db = getDb();
  // D1은 한 SQL 문에 사용할 수 있는 바인딩 수가 제한되므로 작은 묶음으로 저장합니다.
  for (const group of chunks(rows, 8)) {
    await db.insert(publicShelters).values(group).onConflictDoUpdate({ target: publicShelters.id, set: {
      name: sql`excluded.name`, organization: sql`excluded.organization`, address: sql`excluded.address`, phone: sql`excluded.phone`, hours: sql`excluded.hours`, closed: sql`excluded.closed`, lat: sql`excluded.lat`, lng: sql`excluded.lng`, approximateLocation: sql`excluded.approximate_location`, syncedAt: sql`excluded.synced_at`,
    } });
  }
}

async function writeAnimals(rows: AnimalRecord[]) {
  const db = getDb();
  for (const group of chunks(rows, 3)) {
    await db.insert(publicAnimals).values(group).onConflictDoUpdate({ target: publicAnimals.id, set: {
      name: sql`excluded.name`, species: sql`excluded.species`, breed: sql`excluded.breed`, upKindCd: sql`excluded.up_kind_cd`, kindCd: sql`excluded.kind_cd`, age: sql`excluded.age`, ageGroup: sql`excluded.age_group`, sex: sql`excluded.sex`, region: sql`excluded.region`, shelterId: sql`excluded.shelter_id`, shelterName: sql`excluded.shelter_name`, shelterAddress: sql`excluded.shelter_address`, shelterPhone: sql`excluded.shelter_phone`, shelterLat: sql`excluded.shelter_lat`, shelterLng: sql`excluded.shelter_lng`, approximateShelterLocation: sql`excluded.approximate_shelter_location`, updated: sql`excluded.updated`, image1: sql`excluded.image_1`, image2: sql`excluded.image_2`, colorsJson: sql`excluded.colors_json`, traitsJson: sql`excluded.traits_json`, summary: sql`excluded.summary`, healthJson: sql`excluded.health_json`, lifeJson: sql`excluded.life_json`, matchReason: sql`excluded.match_reason`, processState: sql`excluded.process_state`, active: true, lastSeenSync: sql`excluded.last_seen_sync`, syncedAt: sql`excluded.synced_at`,
    } });
  }
}

export async function syncPublicAnimals() {
  await ensureTables();
  const db = getDb(), startedAt = new Date().toISOString(), syncId = crypto.randomUUID();
  await db.insert(publicSyncState).values({ id: "public-animals", status: "running", lastStartedAt: startedAt, itemCount: 0, pageCount: 0 }).onConflictDoUpdate({ target: publicSyncState.id, set: { status: "running", lastStartedAt: startedAt, message: "" } });
  try {
    const sheltersResult = await fetchAll<ShelterItem>(SHELTER_ENDPOINT);
    const shelterRows = sheltersResult.items.map(item => mapShelter(item, startedAt)).filter((item): item is ShelterRecord => Boolean(item));
    await writeShelters(shelterRows);
    const shelterMap = new Map(shelterRows.map(item => [item.id, item]));
    const animalsResult = await fetchAll<AnimalItem>(ANIMAL_ENDPOINT);
    const animalRows = animalsResult.items.map(item => mapAnimal(item, shelterMap, syncId, startedAt)).filter((item): item is AnimalRecord => Boolean(item));
    await writeAnimals(animalRows);
    await db.update(publicAnimals).set({ active: false }).where(ne(publicAnimals.lastSeenSync, syncId));
    const completedAt = new Date().toISOString(), pages = sheltersResult.pages + animalsResult.pages;
    await db.update(publicSyncState).set({ status: "complete", lastCompletedAt: completedAt, itemCount: animalRows.length, pageCount: pages, message: "" }).where(eq(publicSyncState.id, "public-animals"));
    return { count: animalRows.length, pages, syncedAt: completedAt };
  } catch (error) {
    await db.update(publicSyncState).set({ status: "failed", message: error instanceof Error ? error.message.slice(0, 500) : "동기화 실패" }).where(eq(publicSyncState.id, "public-animals"));
    throw error;
  }
}

export async function ensurePublicAnimals() {
  const schemaChanged = await ensureTables();
  const db = getDb();
  const [state] = await db.select().from(publicSyncState).where(eq(publicSyncState.id, "public-animals")).limit(1);
  const [existing] = await db.select({ id: publicAnimals.id }).from(publicAnimals).where(eq(publicAnimals.active, true)).limit(1);
  const completed = state?.lastCompletedAt ? new Date(state.lastCompletedAt).getTime() : 0;
  if (existing && !schemaChanged && Date.now() - completed < SYNC_INTERVAL_MS) return state;
  if (!runningSync) runningSync = syncPublicAnimals().finally(() => { runningSync = null; });
  // 저장 데이터가 있으면 즉시 응답하고 뒤에서 갱신해 화면을 50초씩 막지 않습니다.
  if (existing && !schemaChanged) { void runningSync.catch(() => undefined); return state; }
  await runningSync;
  const [next] = await db.select().from(publicSyncState).where(eq(publicSyncState.id, "public-animals")).limit(1);
  return next;
}

function fromStored(row: StoredAnimal): Animal {
  const images = [row.image1, row.image2].filter(Boolean);
  return {
    id: row.id, name: row.name, species: row.species, breed: row.breed, upKindCd: row.upKindCd, kindCd: row.kindCd, age: row.age, ageGroup: ageGroup(row.age), sex: row.sex,
    region: row.region, shelter: row.shelterName, shelterId: row.shelterId || undefined, shelterAddress: row.shelterAddress || undefined,
    shelterPhone: row.shelterPhone || undefined, shelterLat: row.shelterLat ?? undefined, shelterLng: row.shelterLng ?? undefined,
    approximateShelterLocation: row.approximateShelterLocation, source: "국가동물보호정보시스템", updated: row.updated,
    image: row.image1, images, photoCount: new Set(images).size, colors: jsonArray(row.colorsJson), traits: jsonArray(row.traitsJson),
    summary: row.summary, health: jsonArray(row.healthJson), life: jsonArray(row.lifeJson), matchReason: row.matchReason,
  };
}

function cursorOffset(cursor: string | null | undefined) { const value = Number.parseInt(cursor || "0", 36); return Number.isFinite(value) && value >= 0 ? value : 0; }

export async function getBreedCounts(options: BreedCountOptions = {}) {
  await ensurePublicAnimals();
  const rows = await getDb().select().from(publicAnimals).where(eq(publicAnimals.active, true)).limit(10000);
  const hasHome = validPoint(Number(options.lat), Number(options.lng));
  const ageFilter = options.ageGroup === "young" ? "어린 친구" : options.ageGroup === "adult" ? "어른 친구" : options.ageGroup === "unknown" ? "나이 미상" : "";
  const sizeFilter = ["small", "medium", "large", "unknown"].includes(options.sizeGroup || "") ? options.sizeGroup : "";
  const sexFilter = options.sex === "female" ? "암컷" : options.sex === "male" ? "수컷" : "";
  const counts: Record<string, { count: number; kindNm: string; species: "dog" | "cat" }> = {};
  for (const row of rows) {
    if ((ageFilter && ageGroup(row.age) !== ageFilter) || (sizeFilter && sizeGroup(row) !== sizeFilter) || (sexFilter && row.sex !== sexFilter)) continue;
    if (!matchesAnimalPublicStatus(fromStored(row), options.publicStatus)) continue;
    if (options.maxDistance && hasHome) {
      if (row.approximateShelterLocation || !validPoint(Number(row.shelterLat), Number(row.shelterLng))) continue;
      const distance = distanceMeters({ lat: Number(options.lat), lng: Number(options.lng) }, { lat: Number(row.shelterLat), lng: Number(row.shelterLng) });
      if (distance > options.maxDistance) continue;
    }
    const key = storedBreedKey(row), current = counts[key];
    counts[key] = { count: (current?.count || 0) + 1, kindNm: key.endsWith(":000000") ? "품종 미상" : row.breed, species: key.startsWith("422400:") ? "cat" : "dog" };
  }
  return counts;
}

export async function getNearbyAnimalsPage(options: { lat?: number; lng?: number; species?: string; publicStatus?: string; breedKeys?: string[]; ageGroup?: string; sizeGroup?: string; sex?: string; color?: string; sort?: string; maxDistance?: number; multiplePhotos?: boolean; exactLocation?: boolean; cursor?: string | null; limit?: number } = {}): Promise<AnimalPage> {
  const state = await ensurePublicAnimals(), db = getDb();
  const rows = await db.select().from(publicAnimals).where(eq(publicAnimals.active, true)).orderBy(desc(publicAnimals.updated)).limit(10000);
  const speciesFilter = options.species === "cat" ? "고양이" : options.species === "dog" ? "강아지" : "";
  const hasHome = validPoint(Number(options.lat), Number(options.lng));
  const ageFilter = options.ageGroup === "young" ? "어린 친구" : options.ageGroup === "adult" ? "어른 친구" : options.ageGroup === "unknown" ? "나이 미상" : "";
  const breedFilters = new Set((options.breedKeys || []).filter(value => /^(417000|422400):\d{6}$/.test(value)).slice(0, 10));
  const sizeFilter = ["small", "medium", "large", "unknown"].includes(options.sizeGroup || "") ? options.sizeGroup : "";
  const sexFilter = options.sex === "female" ? "암컷" : options.sex === "male" ? "수컷" : "";
  const colorFilter = options.color?.trim().toLocaleLowerCase("ko-KR") || "";
  const prepared = rows.filter(row => (!speciesFilter || row.species === speciesFilter) && (!breedFilters.size || breedFilters.has(storedBreedKey(row))) && (!ageFilter || ageGroup(row.age) === ageFilter) && (!sizeFilter || sizeGroup(row) === sizeFilter) && (!sexFilter || row.sex === sexFilter) && (!colorFilter || matchesColorGroup(row.colorsJson, colorFilter)) && (!options.multiplePhotos || Boolean(row.image2 && row.image2 !== row.image1)) && (!options.exactLocation || (!row.approximateShelterLocation && validPoint(Number(row.shelterLat), Number(row.shelterLng))))).map(row => {
    const animal = fromStored(row);
    if (!matchesAnimalPublicStatus(animal, options.publicStatus)) return null;
    const hasExactPoint = hasHome && !row.approximateShelterLocation && validPoint(Number(row.shelterLat), Number(row.shelterLng));
    return hasExactPoint ? { ...animal, distanceMeters: distanceMeters({ lat: Number(options.lat), lng: Number(options.lng) }, { lat: Number(row.shelterLat), lng: Number(row.shelterLng) }) } : animal;
  }).filter((animal): animal is Animal => Boolean(animal)).filter(animal => !options.maxDistance || !hasHome || (animal.distanceMeters !== undefined && animal.distanceMeters <= options.maxDistance)).sort((a, b) => options.sort === "recent" ? b.updated.localeCompare(a.updated) || a.id.localeCompare(b.id) : (a.distanceMeters ?? Infinity) - (b.distanceMeters ?? Infinity) || b.updated.localeCompare(a.updated) || a.id.localeCompare(b.id));
  const limit = Math.min(50, Math.max(1, options.limit || 20)), offset = cursorOffset(options.cursor), pageItems = prepared.slice(offset, offset + limit);
  const items = await Promise.all(pageItems.map(async animal => {
    const images = await distinctAnimalImages(animal.id, animal.images || [animal.image]);
    return { ...animal, image: images[0] || animal.image, images, photoCount: images.length };
  }));
  const nextOffset = offset + items.length;
  const completedAt = state?.lastCompletedAt || null;
  return { items, total: prepared.length, nextCursor: nextOffset < prepared.length ? nextOffset.toString(36) : null, syncedAt: completedAt, stale: !completedAt || Date.now() - new Date(completedAt).getTime() >= SYNC_INTERVAL_MS * 2 };
}

export async function getStoredAnimalById(id: string) {
  await ensureTables();
  const [row] = await getDb().select().from(publicAnimals).where(eq(publicAnimals.id, id)).limit(1);
  if (!row) return undefined;
  const animal = fromStored(row), images = await distinctAnimalImages(animal.id, animal.images || [animal.image]);
  return { ...animal, image: images[0] || animal.image, images, photoCount: images.length };
}

export async function getAnimalsByShelterId(shelterId: string, limit = 200) {
  await ensurePublicAnimals();
  const db = getDb(), where = and(eq(publicAnimals.active, true), eq(publicAnimals.shelterId, shelterId));
  const [rows, totals] = await Promise.all([
    db.select().from(publicAnimals).where(where).orderBy(desc(publicAnimals.updated)).limit(Math.min(500, Math.max(1, limit))),
    db.select({ value: count() }).from(publicAnimals).where(where),
  ]);
  const items = await Promise.all(rows.map(async row => {
    const animal = fromStored(row), images = await distinctAnimalImages(animal.id, animal.images || [animal.image]);
    return { ...animal, image: images[0] || animal.image, images, photoCount: images.length };
  }));
  return { items, total: Number(totals[0]?.value || 0) };
}
