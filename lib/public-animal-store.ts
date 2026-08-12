import type { publicAnimals, publicShelters, publicSyncState } from "../db/schema";
import type { Animal } from "./data";
import { distanceMeters } from "./geo";
import { distinctAnimalImages } from "./animal-images";
import { matchesAnimalPublicStatus } from "./animal-public-status";
import { getSupabaseServerClient } from "./supabase/server";

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
let activeAnimalsCache: { at: number; rows: StoredAnimal[] } | null = null;
const ACTIVE_ANIMALS_CACHE_MS = 60 * 1000;
const LIST_ANIMAL_COLUMNS = "id,name,species,breed,up_kind_cd,kind_cd,age,age_group,sex,region,shelter_id,shelter_name,shelter_address,shelter_phone,shelter_lat,shelter_lng,approximate_shelter_location,updated,image_1,image_2,colors_json,traits_json,summary,health_json,life_json,match_reason,process_state,active,last_seen_sync,synced_at";

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

async function ensureTables() {
  return false;
}

function storedAnimal(row: Record<string, unknown>) {
  return {
    ...row,
    upKindCd: row.up_kind_cd ?? "",
    kindCd: row.kind_cd ?? "",
    ageGroup: row.age_group ?? "나이 미상",
    shelterId: row.shelter_id ?? null,
    shelterName: row.shelter_name ?? "관할 보호센터",
    shelterAddress: row.shelter_address ?? "",
    shelterPhone: row.shelter_phone ?? "",
    shelterLat: row.shelter_lat ?? null,
    shelterLng: row.shelter_lng ?? null,
    approximateShelterLocation: row.approximate_shelter_location ?? true,
    image1: row.image_1 ?? "",
    image2: row.image_2 ?? "",
    colorsJson: row.colors_json ?? "[]",
    traitsJson: row.traits_json ?? "[]",
    healthJson: row.health_json ?? "[]",
    lifeJson: row.life_json ?? "[]",
    matchReason: row.match_reason ?? "",
    processState: row.process_state ?? "",
    lastSeenSync: row.last_seen_sync ?? "",
    syncedAt: row.synced_at ?? "",
  } as StoredAnimal;
}

function storedShelter(row: ShelterRecord) {
  return {
    id: row.id,
    name: row.name,
    organization: row.organization,
    address: row.address,
    phone: row.phone,
    hours: row.hours,
    closed: row.closed,
    lat: row.lat,
    lng: row.lng,
    approximate_location: row.approximateLocation,
    synced_at: row.syncedAt,
  };
}

function storedAnimalRow(row: AnimalRecord) {
  return {
    id: row.id, name: row.name, species: row.species, breed: row.breed, up_kind_cd: row.upKindCd, kind_cd: row.kindCd,
    age: row.age, age_group: row.ageGroup, sex: row.sex, region: row.region, shelter_id: row.shelterId,
    shelter_name: row.shelterName, shelter_address: row.shelterAddress, shelter_phone: row.shelterPhone,
    shelter_lat: row.shelterLat, shelter_lng: row.shelterLng, approximate_shelter_location: row.approximateShelterLocation,
    updated: row.updated, image_1: row.image1, image_2: row.image2, colors_json: row.colorsJson, traits_json: row.traitsJson,
    summary: row.summary, health_json: row.healthJson, life_json: row.lifeJson, match_reason: row.matchReason,
    process_state: row.processState, active: row.active, last_seen_sync: row.lastSeenSync, synced_at: row.syncedAt,
  };
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
  const { error } = await getSupabaseServerClient().from("public_shelters").upsert(rows.map(storedShelter), { onConflict: "id" });
  if (error) throw error;
}

async function writeAnimals(rows: AnimalRecord[]) {
  for (const group of chunks(rows.map(storedAnimalRow), 500)) {
    const { error } = await getSupabaseServerClient().from("public_animals").upsert(group, { onConflict: "id" });
    if (error) throw error;
  }
  activeAnimalsCache = null;
}

export async function syncPublicAnimals() {
  await ensureTables();
  const supabase = getSupabaseServerClient(), startedAt = new Date().toISOString(), syncId = crypto.randomUUID();
  await supabase.from("public_sync_state").upsert({ id: "public-animals", status: "running", last_started_at: startedAt, item_count: 0, page_count: 0, message: "" }, { onConflict: "id" });
  try {
    const sheltersResult = await fetchAll<ShelterItem>(SHELTER_ENDPOINT);
    const shelterRows = sheltersResult.items.map(item => mapShelter(item, startedAt)).filter((item): item is ShelterRecord => Boolean(item));
    await writeShelters(shelterRows);
    const shelterMap = new Map(shelterRows.map(item => [item.id, item]));
    const animalsResult = await fetchAll<AnimalItem>(ANIMAL_ENDPOINT);
    const animalRows = animalsResult.items.map(item => mapAnimal(item, shelterMap, syncId, startedAt)).filter((item): item is AnimalRecord => Boolean(item));
    await writeAnimals(animalRows);
    const { error: deactivateError } = await supabase.from("public_animals").update({ active: false }).neq("last_seen_sync", syncId);
    if (deactivateError) throw deactivateError;
    const completedAt = new Date().toISOString(), pages = sheltersResult.pages + animalsResult.pages;
    await supabase.from("public_sync_state").update({ status: "complete", last_completed_at: completedAt, item_count: animalRows.length, page_count: pages, message: "" }).eq("id", "public-animals");
    return { count: animalRows.length, pages, syncedAt: completedAt };
  } catch (error) {
    await supabase.from("public_sync_state").update({ status: "failed", message: error instanceof Error ? error.message.slice(0, 500) : "동기화 실패" }).eq("id", "public-animals");
    throw error;
  }
}

export async function ensurePublicAnimals() {
  const schemaChanged = await ensureTables();
  const supabase = getSupabaseServerClient();
  const [{ data: states }, { data: existingRows }] = await Promise.all([
    supabase.from("public_sync_state").select("*").eq("id", "public-animals").limit(1),
    supabase.from("public_animals").select("id").eq("active", true).limit(1),
  ]);
  const state = states?.[0] as (typeof publicSyncState.$inferSelect | undefined);
  const existing = existingRows?.[0];
  const completed = state?.lastCompletedAt ? new Date(state.lastCompletedAt).getTime() : state?.last_completed_at ? new Date(state.last_completed_at).getTime() : 0;
  if (existing && !schemaChanged && Date.now() - completed < SYNC_INTERVAL_MS) return state;
  if (!runningSync) runningSync = syncPublicAnimals().finally(() => { runningSync = null; });
  // 저장 데이터가 있으면 즉시 응답하고 뒤에서 갱신해 화면을 50초씩 막지 않습니다.
  if (existing && !schemaChanged) { void runningSync.catch(() => undefined); return state; }
  await runningSync;
  const { data: nextRows } = await supabase.from("public_sync_state").select("*").eq("id", "public-animals").limit(1);
  const next = nextRows?.[0] as (typeof publicSyncState.$inferSelect | undefined);
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
type SearchCursor = { updatedAt?: string; id?: string; distanceMeters?: number };
function decodeSearchCursor(cursor: string | null | undefined): SearchCursor | null {
  if (!cursor) return null;
  try {
    const decoded = JSON.parse(Buffer.from(cursor, "base64url").toString("utf8")) as SearchCursor;
    return decoded && typeof decoded === "object" ? decoded : null;
  } catch { return null; }
}
function encodeSearchCursor(value: SearchCursor) { return Buffer.from(JSON.stringify(value)).toString("base64url"); }

async function activeAnimals() {
  if (activeAnimalsCache && Date.now() - activeAnimalsCache.at < ACTIVE_ANIMALS_CACHE_MS) return activeAnimalsCache.rows;
  const { data, error } = await getSupabaseServerClient().from("public_animals").select(LIST_ANIMAL_COLUMNS).eq("active", true).order("updated", { ascending: false }).limit(10000);
  if (error) throw error;
  const rows = (data || []).map(row => storedAnimal(row as Record<string, unknown>));
  activeAnimalsCache = { at: Date.now(), rows };
  return rows;
}

export async function getBreedCounts(options: BreedCountOptions = {}) {
  await ensurePublicAnimals();
  const rows = await activeAnimals();
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
  const state = await ensurePublicAnimals();
  const limit = Math.min(50, Math.max(1, options.limit || 20));
  const hasHome = validPoint(Number(options.lat), Number(options.lng));
  const canUseDatabaseSearch = !options.sizeGroup && !options.maxDistance && !options.multiplePhotos && !options.exactLocation;
  if (canUseDatabaseSearch) {
    const cursor = decodeSearchCursor(options.cursor);
    const sort = options.sort === "distance" && hasHome ? "distance" : "recent";
    const kindCodes = (options.breedKeys || []).map(value => value.split(":")[1]).filter(value => /^\d{6}$/.test(value));
    const { data, error } = await getSupabaseServerClient().rpc("search_public_animals", {
      p_limit: limit,
      p_cursor_updated_at: cursor?.updatedAt || null,
      p_cursor_id: cursor?.id || null,
      p_cursor_distance_meters: cursor?.distanceMeters ?? null,
      p_lat: hasHome ? options.lat : null,
      p_lng: hasHome ? options.lng : null,
      p_sort: sort,
      p_species: options.species === "cat" ? "고양이" : options.species === "dog" ? "강아지" : null,
      p_age_group: options.ageGroup || null,
      p_sex: options.sex === "female" ? "암컷" : options.sex === "male" ? "수컷" : null,
      p_kind_codes: kindCodes.length ? kindCodes : null,
      p_color: options.color || null,
      p_public_phase: options.publicStatus === "notice" ? "notice" : options.publicStatus === "checking" ? "checking" : null,
    });
    if (!error && data) {
      const items = (data as Array<Record<string, unknown>>).map(row => {
        const animal = fromStored(storedAnimal(row));
        const distance = Number(row.distance_meters);
        return Number.isFinite(distance) ? { ...animal, distanceMeters: distance } : animal;
      });
      const last = data.at(-1) as Record<string, unknown> | undefined;
      const total = Number((data[0] as Record<string, unknown> | undefined)?.total_count || 0);
      const nextCursor = data.length === limit && last ? encodeSearchCursor(sort === "distance"
        ? { distanceMeters: Number(last.distance_meters), id: String(last.id) }
        : { updatedAt: String(last.updated_at || ""), id: String(last.id) }) : null;
      const completedAt = state?.lastCompletedAt || null;
      return { items, total, nextCursor, syncedAt: completedAt, stale: !completedAt || Date.now() - new Date(completedAt).getTime() >= SYNC_INTERVAL_MS * 2 };
    }
  }
  const rows = await activeAnimals();
  const speciesFilter = options.species === "cat" ? "고양이" : options.species === "dog" ? "강아지" : "";
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
  const offset = cursorOffset(options.cursor), pageItems = prepared.slice(offset, offset + limit);
  // 목록에서는 동기화된 대표 이미지들만 사용합니다. 추가 사진 조회는 상세페이지에서만 수행해
  // 스크롤마다 카드 수만큼 별도 DB 요청이 발생하지 않도록 합니다.
  const items = pageItems;
  const nextOffset = offset + items.length;
  const completedAt = state?.lastCompletedAt || null;
  return { items, total: prepared.length, nextCursor: nextOffset < prepared.length ? nextOffset.toString(36) : null, syncedAt: completedAt, stale: !completedAt || Date.now() - new Date(completedAt).getTime() >= SYNC_INTERVAL_MS * 2 };
}

export async function getStoredAnimalById(id: string) {
  await ensureTables();
  const { data, error } = await getSupabaseServerClient().from("public_animals").select("*").eq("id", id).limit(1);
  if (error || !data?.[0]) return undefined;
  const animal = fromStored(storedAnimal(data[0] as Record<string, unknown>)), images = await distinctAnimalImages(animal.id, animal.images || [animal.image]);
  return { ...animal, image: images[0] || animal.image, images, photoCount: images.length };
}

export async function getAnimalsByShelterId(shelterId: string, limit = 200) {
  try {
    await ensurePublicAnimals();
    const supabase = getSupabaseServerClient(), safeLimit = Math.min(500, Math.max(1, limit));
    const [{ data, error }, { count: total, error: countError }] = await Promise.all([
      supabase.from("public_animals").select("*").eq("active", true).eq("shelter_id", shelterId).order("updated", { ascending: false }).limit(safeLimit),
      supabase.from("public_animals").select("id", { count: "exact", head: true }).eq("active", true).eq("shelter_id", shelterId),
    ]);
    if (error || countError) throw error || countError;
    const rows = (data || []).map(row => storedAnimal(row as Record<string, unknown>));
    const items = await Promise.all(rows.map(async row => {
      const animal = fromStored(row), images = await distinctAnimalImages(animal.id, animal.images || [animal.image]);
      return { ...animal, image: images[0] || animal.image, images, photoCount: images.length };
    }));
    return { items, total: total || 0 };
  } catch {
    // Public shelter metadata can still render when the optional Supabase feed is unavailable.
    return { items: [], total: 0 };
  }
}
