import type { publicAnimals, publicShelters, publicSyncState } from "../db/schema";
import type { Animal } from "./data";
import type { LostAnimal } from "./public-data";
import { cache } from "react";
import { distanceMeters } from "./geo";
import { matchesAnimalPublicStatus } from "./animal-public-status";
import { getSupabaseServerClient } from "./supabase/server";
import sharp from "sharp";

const ANIMAL_ENDPOINT = "https://apis.data.go.kr/1543061/abandonmentPublicService_v2/abandonmentPublic_v2";
const SHELTER_ENDPOINT = "https://apis.data.go.kr/1543061/animalShelterSrvc_v2/shelterInfo_v2";
const LOSS_ENDPOINT = "https://apis.data.go.kr/1543061/lossInfoService/lossInfo";
const PAGE_SIZE = 1000;
const MAX_PAGES = 50;
const SYNC_INTERVAL_MS = 15 * 60 * 1000;
const ARCHIVE_RETENTION_MS = 365 * 24 * 60 * 60 * 1000;

type Envelope<T> = { response?: { header?: { resultCode?: string; resultMsg?: string }; body?: { items?: { item?: T | T[] }; totalCount?: number | string } } };
type AnimalItem = { desertionNo?: string; happenDt?: string; kindFullNm?: string; upKindCd?: string; upKindNm?: string; kindCd?: string; kindNm?: string; colorCd?: string; age?: string; weight?: string; noticeNo?: string; noticeSdt?: string; noticeEdt?: string; popfile1?: string; popfile2?: string; processState?: string; sexCd?: string; neuterYn?: string; specialMark?: string; careRegNo?: string; careNm?: string; careTel?: string; careAddr?: string; orgNm?: string; updTm?: string };
type LossItem = { happenDt?: string; happenAddr?: string; happenPlace?: string; orgNm?: string; popfile?: string; kindCd?: string; sexCd?: string; age?: string; colorCd?: string; specialMark?: string; rfidCd?: string };
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
  species?: "cat" | "dog" | "all";
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
let activeAnimalsInFlight: Promise<StoredAnimal[]> | null = null;
const ACTIVE_ANIMALS_CACHE_MS = 60 * 1000;
const LIST_ANIMAL_COLUMNS = "id,name,species,breed,up_kind_cd,kind_cd,age,age_group,sex,region,shelter_id,shelter_name,shelter_address,shelter_phone,shelter_lat,shelter_lng,approximate_shelter_location,updated,updated_at,image_1,image_2,image_1_storage,image_2_storage,colors_json,traits_json,summary,health_json,life_json,match_reason,process_state,active,last_seen_sync,synced_at,size_group,has_multiple_photos,has_exact_location,color_search,public_phase";
const STORAGE_BUCKET = "animal-images";
type StoredAnimalWithImages = StoredAnimal & { image_1_storage?: string | null; image_2_storage?: string | null };
type SyncStateRow = { lastCompletedAt?: string | null; last_completed_at?: string | null };

function apiKey() { return process.env.PUBLIC_DATA_API_KEY?.trim(); }
function array<T>(value: T | T[] | undefined) { return !value ? [] : Array.isArray(value) ? value : [value]; }
function secureImage(value = "") { return value.replace(/^http:\/\//, "https://"); }
function compactDate(value = "") { const digits = value.replace(/\D/g, "").slice(0, 8); return digits.length === 8 ? `${digits.slice(0, 4)}. ${Number(digits.slice(4, 6))}. ${Number(digits.slice(6, 8))}.` : value; }
function isoDate(value = "") { const match = value.match(/(\d{4})\D+(\d{1,2})\D+(\d{1,2})/); if (!match) return null; const date = new Date(Date.UTC(Number(match[1]), Number(match[2]) - 1, Number(match[3]))); return Number.isNaN(date.getTime()) ? null : date.toISOString(); }
function sex(value = "") { return value === "M" ? "수컷" : value === "F" ? "암컷" : "미상"; }
function species(item: AnimalItem) { return item.upKindNm || item.kindFullNm?.match(/^\[([^\]]+)/)?.[1] || "기타"; }
function supported(value: string) { return /고양이|개|강아지/.test(value) && !/기타/.test(value); }
function ageGroup(value = ""): Animal["ageGroup"] { if (value.includes("60일미만")) return "어린 친구"; const born = Number(value.match(/(19|20)\d{2}/)?.[0]); if (!born) return "나이 미상"; return new Date().getFullYear() - born <= 1 ? "어린 친구" : "어른 친구"; }
function lostSpecies(value = "") { const text = value.trim().toLocaleLowerCase("ko-KR"); if (/고양이|묘|러시안\s*블루|랙돌|페르시안|샴|스코티시|메인쿤|먼치킨|스핑크스/.test(text)) return "고양이"; if (/견|강아지|^개$|말티즈|푸들|포메라니안|비숑|치와와|시츄|진돗개|리트리버|스피츠|테리어|불독|닥스훈트|비글|웰시코기/.test(text)) return "강아지"; return "기타"; }
function lostSex(value = "") { return value === "M" ? "수컷" : value === "F" ? "암컷" : "미상"; }
function lostDate(value = "") { return value.replace(/\.0$/, "") || "발생일 미상"; }
function mapLostAnimal(item: LossItem, index: number, syncedAt: string) {
  const id = item.rfidCd?.trim() || `${item.happenDt || "loss"}-${index}`;
  const species = lostSpecies(item.kindCd);
  if (!item.popfile || species === "기타") return null;
  return { id, legacyId: `${item.happenDt || "loss"}-${index}`, species, breed: item.kindCd || "품종 미상", sex: lostSex(item.sexCd), age: item.age || "나이 미상", color: item.colorCd || "털색 미상", happenedAt: lostDate(item.happenDt), region: item.orgNm || "지역 미상", address: item.happenAddr || "", place: `${item.orgNm || item.happenAddr?.split(" ").slice(0, 2).join(" ") || "관할 지역"} 인근 · 상세 위치 비공개`, description: item.specialMark || "등록된 특징이 없습니다.", image: secureImage(item.popfile), active: true, synced_at: syncedAt };
}
function displayName(item: AnimalItem) { return [item.kindNm || species(item), item.noticeNo?.split("-").at(-1)].filter(Boolean).join(" · "); }
function validPoint(lat: number, lng: number) { return Number.isFinite(lat) && Number.isFinite(lng) && lat > 30 && lat < 40 && lng > 120 && lng < 135; }
function jsonArray(value: string) { try { const result = JSON.parse(value); return Array.isArray(result) ? result.map(String) : []; } catch { return []; } }
function weightKg(row: { traitsJson?: string | null }) { const value = jsonArray(row.traitsJson || "[]").find(item => /kg/i.test(item)); if (!value) return undefined; const values = [...value.matchAll(/\d+(?:\.\d+)?/g)].map(match => Number(match[0])).filter(number => number > 0 && number <= 150); return values.length ? values.reduce((sum, number) => sum + number, 0) / values.length : undefined; }
function sizeGroup(row: { traitsJson?: string | null; species: string }) { const weight = weightKg(row); if (weight === undefined) return "unknown"; if (row.species === "고양이") return weight < 3 ? "small" : weight < 6 ? "medium" : "large"; return weight < 10 ? "small" : weight < 25 ? "medium" : "large"; }

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
function syncCompletedAt(state: SyncStateRow | undefined) { return state?.lastCompletedAt || state?.last_completed_at || null; }

async function ensureTables() {
  return false;
}

async function withSyncLock<T>(key: string, task: () => Promise<T>): Promise<T> {
  const supabase = getSupabaseServerClient();
  const { data, error } = await supabase.rpc("try_acquire_sync_lock", { p_key: key, p_lease_seconds: 300 });
  if (error) throw new Error(`동기화 잠금을 확보하지 못했습니다: ${error.message}`);
  if (data !== true) throw new Error("같은 동기화 작업이 이미 실행 중입니다.");
  try {
    return await task();
  } finally {
    try { await supabase.rpc("release_sync_lock", { p_key: key }); } catch { /* best effort */ }
  }
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
    image1: row.image_1_storage || row.image_1 || "",
    image2: row.image_2_storage || row.image_2 || "",
    image_1_storage: row.image_1_storage ?? null,
    image_2_storage: row.image_2_storage ?? null,
    colorsJson: row.colors_json ?? "[]",
    traitsJson: row.traits_json ?? "[]",
    healthJson: row.health_json ?? "[]",
    lifeJson: row.life_json ?? "[]",
    matchReason: row.match_reason ?? "",
    processState: row.process_state ?? "",
    lastSeenSync: row.last_seen_sync ?? "",
    syncedAt: row.synced_at ?? "",
  } as unknown as StoredAnimal;
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
  const life = row.lifeJson || "", noticeEnd = [...life.matchAll(/(\d{4})\D+(\d{1,2})\D+(\d{1,2})/g)].at(-1)?.[0] || "";
  const noticeEndAt = isoDate(noticeEnd), processState = row.processState || "";
  const publicPhase = processState.startsWith("종료") ? "ended" : !life.includes("공고 ") ? "unknown" : noticeEndAt && new Date(noticeEndAt).getTime() < Date.now() ? "checking" : "notice";
  return {
    id: row.id, name: row.name, species: row.species, breed: row.breed, up_kind_cd: row.upKindCd, kind_cd: row.kindCd,
    age: row.age, age_group: row.ageGroup, sex: row.sex, region: row.region, shelter_id: row.shelterId,
    shelter_name: row.shelterName, shelter_address: row.shelterAddress, shelter_phone: row.shelterPhone,
    shelter_lat: row.shelterLat, shelter_lng: row.shelterLng, approximate_shelter_location: row.approximateShelterLocation,
    updated: row.updated, image_1: row.image1, image_2: row.image2, colors_json: row.colorsJson, traits_json: row.traitsJson,
    summary: row.summary, health_json: row.healthJson, life_json: row.lifeJson, match_reason: row.matchReason,
    process_state: row.processState, active: row.active, last_seen_sync: row.lastSeenSync, synced_at: row.syncedAt,
    updated_at: isoDate(row.updated), notice_end_at: noticeEndAt, public_phase: publicPhase, color_search: (row.colorsJson || "").toLocaleLowerCase("ko-KR"), size_group: sizeGroup(row), has_multiple_photos: Boolean(row.image2 && row.image2 !== row.image1), has_exact_location: !row.approximateShelterLocation,
  };
}

async function fetchPage<T>(endpoint: string, pageNo: number, numOfRows: number, extraParams: Record<string, string> = {}) {
  const key = apiKey();
  if (!key) throw new Error("PUBLIC_DATA_API_KEY가 설정되지 않았습니다.");
  const url = new URL(endpoint);
  url.searchParams.set("serviceKey", key);
  url.searchParams.set("pageNo", String(pageNo));
  url.searchParams.set("numOfRows", String(numOfRows));
  url.searchParams.set("_type", "json");
  for (const [name, value] of Object.entries(extraParams)) url.searchParams.set(name, value);
  const response = await fetch(url, { cache: "no-store", signal: AbortSignal.timeout(15000) });
  if (!response.ok) throw new Error(`공공데이터 API 응답 오류 ${response.status}`);
  const payload = await response.json() as Envelope<T>;
  if (payload.response?.header?.resultCode !== "00") throw new Error(payload.response?.header?.resultMsg || "공공데이터 API 오류");
  return { items: array(payload.response.body?.items?.item), total: Number(payload.response.body?.totalCount || 0) };
}

type FetchAllResult<T> = { items: T[]; pages: number; total: number; complete: boolean };

async function fetchAll<T>(endpoint: string, options: { stopOnShortPage?: boolean } = {}): Promise<FetchAllResult<T>> {
  const items: T[] = [];
  const seenPages = new Set<string>();
  let page = 1, total = 0;
  let endedByShortPage = false;
  while (page <= MAX_PAGES) {
    const result = await fetchPage<T>(endpoint, page, PAGE_SIZE);
    const fingerprint = JSON.stringify(result.items);
    if (seenPages.has(fingerprint)) break;
    seenPages.add(fingerprint);
    items.push(...result.items);
    total = result.total;
    if (options.stopOnShortPage && result.items.length < PAGE_SIZE) { endedByShortPage = true; break; }
    // 공공데이터 API는 요청한 PAGE_SIZE보다 적게 반환하면서도
    // totalCount보다 남은 데이터가 있을 수 있습니다(실종 API가 대표적).
    // 일반 수집에서는 짧은 페이지를 종료 신호로 사용하지 않습니다.
    if (!result.items.length || items.length >= total) break;
    page += 1;
  }
  return { items, pages: page, total, complete: endedByShortPage || total === 0 || items.length >= total };
}

type StreamedAnimalResult = { count: number; pages: number; total: number; complete: boolean };

async function syncAnimalPages(shelterMap: Map<string, ShelterRecord>, syncId: string, syncedAt: string): Promise<StreamedAnimalResult> {
  const seenPages = new Set<string>();
  let page = 1, total = 0, fetched = 0, count = 0;
  while (page <= MAX_PAGES) {
    const result = await fetchPage<AnimalItem>(ANIMAL_ENDPOINT, page, PAGE_SIZE);
    const fingerprint = JSON.stringify(result.items);
    if (seenPages.has(fingerprint)) break;
    seenPages.add(fingerprint);
    total = result.total;
    fetched += result.items.length;
    const rows = result.items
      .map(item => mapAnimal(item, shelterMap, syncId, syncedAt))
      .filter((item): item is AnimalRecord => Boolean(item));
    if (rows.length) {
      await writeAnimals(rows);
      count += rows.length;
    }
    if (!result.items.length || fetched >= total) {
      return { count, pages: page, total, complete: total === 0 || fetched >= total };
    }
    page += 1;
  }
  return { count, pages: Math.max(1, page - 1), total, complete: total === 0 || fetched >= total };
}

async function fetchAllLostAnimals(): Promise<FetchAllResult<LossItem>> {
  const items: LossItem[] = [];
  const seenPages = new Set<string>();
  const pageSize = 100;
  let page = 1;
  let total = 0;
  const now = new Date();
  const endDate = `${now.getUTCFullYear()}${String(now.getUTCMonth() + 1).padStart(2, "0")}${String(now.getUTCDate()).padStart(2, "0")}`;
  const start = new Date(now);
  start.setUTCFullYear(start.getUTCFullYear() - 1);
  const startDate = `${start.getUTCFullYear()}${String(start.getUTCMonth() + 1).padStart(2, "0")}${String(start.getUTCDate()).padStart(2, "0")}`;
  const dateParams = { bgnde: startDate, endde: endDate };
  let reachedEnd = false;
  while (page <= MAX_PAGES) {
    const result = await fetchPage<LossItem>(LOSS_ENDPOINT, page, pageSize, dateParams);
    const current = result.items.filter(Boolean);
    const fingerprint = JSON.stringify(current);
    if (!current.length || seenPages.has(fingerprint)) { reachedEnd = true; break; }
    seenPages.add(fingerprint);
    items.push(...current);
    total = result.total;
    if (items.length >= total) { reachedEnd = true; break; }
    page += 1;
    // 분실동물 API는 totalCount를 279로 반환하면서 실제 페이지는
    // 176건에서 끝내는 경우가 있어, 빈 페이지를 실제 종료 신호로 사용합니다.
  }
  return { items, pages: Math.max(1, page - 1), total, complete: reachedEnd && items.length > 0 };
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
  for (const group of chunks(rows.map(storedAnimalRow), 1000)) {
    const { error } = await getSupabaseServerClient().from("public_animals").upsert(group, { onConflict: "id" });
    if (error) throw error;
  }
  activeAnimalsCache = null;
}

function storagePathFromUrl(value: string) {
  if (!value) return "";
  try {
    const pathname = new URL(value).pathname;
    const marker = `/storage/v1/object/public/${STORAGE_BUCKET}/`;
    const index = pathname.indexOf(marker);
    return index >= 0 ? decodeURIComponent(pathname.slice(index + marker.length)) : "";
  } catch {
    return "";
  }
}

async function removeStoredAnimalImages(supabase: ReturnType<typeof getSupabaseServerClient>, rows: Array<Record<string, unknown>>) {
  const paths = rows.flatMap(row => [row.image_1_storage, row.image_2_storage].map(value => storagePathFromUrl(String(value || "")))).filter(Boolean);
  if (!paths.length) return;
  for (const group of chunks(paths, 100)) {
    const { error } = await supabase.storage.from(STORAGE_BUCKET).remove(group);
    if (error) throw error;
  }
}

async function compactExpiredAnimals(supabase: ReturnType<typeof getSupabaseServerClient>, now: string) {
  const cutoff = new Date(Date.now() - ARCHIVE_RETENTION_MS).toISOString();
  const { data: expired, error } = await supabase.from("public_animals")
    .select("id,image_1_storage,image_2_storage")
    .eq("active", false)
    .lt("synced_at", cutoff)
    .limit(1000);
  if (error) throw error;
  if (!expired?.length) return { deleted: 0, compacted: 0 };

  const ids = expired.map(row => String(row.id));
  const { data: favoriteRows, error: favoriteError } = await supabase.from("favorites").select("animal_id").in("animal_id", ids);
  if (favoriteError) throw favoriteError;
  const favoriteIds = new Set((favoriteRows || []).map(row => String(row.animal_id)));
  const deletable = expired.filter(row => !favoriteIds.has(String(row.id)));
  const retained = expired.filter(row => favoriteIds.has(String(row.id)));

  await removeStoredAnimalImages(supabase, expired as Array<Record<string, unknown>>);
  if (deletable.length) {
    const { error: deleteError } = await supabase.from("public_animals").delete().in("id", deletable.map(row => String(row.id)));
    if (deleteError) throw deleteError;
  }
  if (retained.length) {
    const { error: compactError } = await supabase.from("public_animals").update({
      image_1: "",
      image_2: "",
      image_1_storage: null,
      image_2_storage: null,
      summary: "공공데이터 공고가 종료된 친구예요.",
      health_json: "[]",
      life_json: "[\"공고가 종료되어 현재 입양 가능 여부를 확인할 수 없어요.\"]",
      match_reason: "",
      process_state: "종료 공고",
      synced_at: now,
    }).in("id", retained.map(row => String(row.id)));
    if (compactError) throw compactError;
  }
  activeAnimalsCache = null;
  return { deleted: deletable.length, compacted: retained.length };
}

async function mirrorAnimalImage(supabase: ReturnType<typeof getSupabaseServerClient>, id: string, slot: number, sourceUrl: string) {
  if (!sourceUrl) return "";
  const response = await fetch(sourceUrl, { cache: "no-store", signal: AbortSignal.timeout(15000) });
  if (!response.ok) throw new Error(`이미지 원본 응답 오류 ${response.status}`);
  const contentType = (response.headers.get("content-type") || "image/jpeg").split(";")[0].toLowerCase();
  if (!contentType.startsWith("image/")) throw new Error("이미지 형식이 아닙니다.");
  const sourceBody = await response.arrayBuffer();
  if (sourceBody.byteLength > 10 * 1024 * 1024) throw new Error("이미지 원본이 10MB를 초과합니다.");
  const sharpProcessor = sharp as unknown as (input: Buffer, options: { failOn: "none" }) => { rotate: () => { resize: (options: { width: number; height: number; fit: "inside"; withoutEnlargement: boolean }) => { webp: (options: { quality: number; effort: number }) => { toBuffer: () => Promise<Buffer> } } } };
  const body = await sharpProcessor(Buffer.from(sourceBody), { failOn: "none" })
    .rotate()
    .resize({ width: 1600, height: 1600, fit: "inside", withoutEnlargement: true })
    .webp({ quality: 80, effort: 4 })
    .toBuffer();
  const digest = [...new Uint8Array(await crypto.subtle.digest("SHA-256", new TextEncoder().encode(sourceUrl)))].map(value => value.toString(16).padStart(2, "0")).join("").slice(0, 16);
  const path = `public/${id}/${slot}-${digest}.webp`;
  const { error } = await supabase.storage.from(STORAGE_BUCKET).upload(path, body, { contentType: "image/webp", cacheControl: "31536000", upsert: false });
  if (error && !/already exists|duplicate/i.test(error.message)) throw error;
  return supabase.storage.from(STORAGE_BUCKET).getPublicUrl(path).data.publicUrl;
}

export async function syncAnimalImages(limit = 100) {
  return withSyncLock("animal-images", async () => {
  const supabase = getSupabaseServerClient();
  const { data: syncStates, error: syncStateError } = await supabase.from("public_sync_state").select("status").eq("id", "public-animals").limit(1);
  if (syncStateError) throw syncStateError;
  if (syncStates?.[0]?.status === "running") {
    return { scanned: 0, pending: 0, mirrored: 0, failed: 0, skipped: "보호소 동물 동기화가 아직 진행 중입니다." };
  }
  const { data: rows, error } = await supabase.from("public_animals")
    .select("id,image_1,image_2,image_1_storage,image_2_storage")
    .eq("active", true)
    .or("image_1_storage.is.null,image_2_storage.is.null,image_1_storage.not.ilike.*.webp*,image_2_storage.not.ilike.*.webp*")
    .order("id", { ascending: true })
    .limit(Math.max(1, Math.min(limit, 100)));
  if (error) throw error;
  let mirrored = 0, failed = 0;
  const optimized = (value: unknown) => typeof value === "string" && /\.webp(?:\?|$)/i.test(value);
  const candidates = (rows || []).flatMap(row => [
    { row, slot: 1, sourceUrl: String(row.image_1 || ""), storageUrl: row.image_1_storage },
    { row, slot: 2, sourceUrl: String(row.image_2 || ""), storageUrl: row.image_2_storage },
  ]).filter(item => item.sourceUrl && !optimized(item.storageUrl));
  const ids = Array.from(new Set(candidates.map(item => String(item.row.id))));
  const { data: existingJobs } = ids.length
    ? await supabase.from("animal_image_jobs").select("animal_id,slot,source_url,attempt_count,next_attempt_at").in("animal_id", ids)
    : { data: [] };
  const jobMap = new Map((existingJobs || []).map(job => [`${job.animal_id}:${job.slot}:${job.source_url}`, job]));
  const now = Date.now();
  const pending = candidates.filter(item => {
    const job = jobMap.get(`${item.row.id}:${item.slot}:${item.sourceUrl}`);
    return !job || !job.next_attempt_at || new Date(job.next_attempt_at).getTime() <= now;
  });
  const newJobs = candidates.filter(item => !jobMap.has(`${item.row.id}:${item.slot}:${item.sourceUrl}`));
  if (newJobs.length) {
    const { error: queueError } = await supabase.from("animal_image_jobs").insert(newJobs.map(item => ({
      animal_id: String(item.row.id), slot: item.slot, source_url: item.sourceUrl,
      status: "pending", updated_at: new Date().toISOString(),
    })));
    if (queueError) throw queueError;
  }
  for (const group of chunks(pending, 8)) {
    await Promise.all(group.map(async row => {
      const jobKey = `${row.row.id}:${row.slot}:${row.sourceUrl}`;
      const previousAttempts = Number(jobMap.get(jobKey)?.attempt_count || 0);
      const attemptCount = previousAttempts + 1;
      const jobFilter = supabase.from("animal_image_jobs").update({
        status: "processing", attempt_count: attemptCount, updated_at: new Date().toISOString(), last_error: "",
      }).eq("animal_id", row.row.id).eq("slot", row.slot).eq("source_url", row.sourceUrl);
      const { error: processingError } = await jobFilter;
      if (processingError) throw processingError;
      try {
        const mirroredImage = await mirrorAnimalImage(supabase, String(row.row.id), row.slot, row.sourceUrl);
        const update: Record<string, string> = row.slot === 1 ? { image_1_storage: mirroredImage } : { image_2_storage: mirroredImage };
        const { error: updateError } = await supabase.from("public_animals").update(update).eq("id", row.row.id);
        if (updateError) throw updateError;
        const { error: completeError } = await supabase.from("animal_image_jobs").update({
          status: "completed", storage_url: mirroredImage, updated_at: new Date().toISOString(), last_error: "",
        }).eq("animal_id", row.row.id).eq("slot", row.slot).eq("source_url", row.sourceUrl);
        if (completeError) throw completeError;
        mirrored += 1;
      } catch (error) {
        const delayHours = Math.min(24, Math.max(1, 2 ** Math.min(attemptCount - 1, 4)));
        await supabase.from("animal_image_jobs").update({
          status: "failed", attempt_count: attemptCount,
          next_attempt_at: new Date(Date.now() + delayHours * 60 * 60 * 1000).toISOString(),
          last_error: error instanceof Error ? error.message.slice(0, 500) : "이미지 처리 실패",
          updated_at: new Date().toISOString(),
        }).eq("animal_id", row.row.id).eq("slot", row.slot).eq("source_url", row.sourceUrl);
        failed += 1;
      }
    }));
  }
  return { scanned: rows?.length || 0, pending: pending.length, mirrored, failed };
  });
}

export async function syncPublicAnimals() {
  return withSyncLock("public-animals", syncPublicAnimalsUnlocked);
}

async function syncPublicAnimalsUnlocked() {
  await ensureTables();
  const supabase = getSupabaseServerClient(), startedAt = new Date().toISOString(), syncId = crypto.randomUUID();
  const { error: startStateError } = await supabase.from("public_sync_state").upsert({ id: "public-animals", status: "running", last_started_at: startedAt, item_count: 0, page_count: 0, message: "" }, { onConflict: "id" });
  if (startStateError) throw startStateError;
  try {
    // 보호소 API는 totalCount를 실제보다 크게 주는 경우가 있어 짧은 페이지에서 종료합니다.
    const sheltersResult = await fetchAll<ShelterItem>(SHELTER_ENDPOINT, { stopOnShortPage: true });
    if (!sheltersResult.complete) throw new Error(`공공데이터 보호소 전체 수집이 완료되지 않았습니다. ${sheltersResult.items.length}/${sheltersResult.total}`);
    const shelterRows = sheltersResult.items.map(item => mapShelter(item, startedAt)).filter((item): item is ShelterRecord => Boolean(item));
    const shelterMap = new Map(shelterRows.map(item => [item.id, item]));
    await writeShelters(shelterRows);
    const animalsResult = await syncAnimalPages(shelterMap, syncId, startedAt);
    if (!animalsResult.complete) throw new Error(`공공데이터 동물 전체 수집이 완료되지 않았습니다. ${animalsResult.count}/${animalsResult.total}`);
    if (animalsResult.total > 0 && animalsResult.count === 0) throw new Error("공공데이터는 수집됐지만 화면에 반영할 동물이 0건입니다. 매핑 조건을 확인해야 합니다.");
    const completedAt = new Date().toISOString();
    const { error: deactivateError } = await supabase.from("public_animals").update({ active: false, synced_at: completedAt }).neq("last_seen_sync", syncId).eq("active", true);
    if (deactivateError) throw deactivateError;
    const archive = await compactExpiredAnimals(supabase, completedAt);
    const pages = sheltersResult.pages + animalsResult.pages;
    const { error: completeStateError } = await supabase.from("public_sync_state").update({ status: "complete", last_completed_at: completedAt, item_count: animalsResult.count, page_count: pages, message: "" }).eq("id", "public-animals");
    if (completeStateError) throw completeStateError;
    return { count: animalsResult.count, pages, syncedAt: completedAt, archive };
  } catch (error) {
    await supabase.from("public_sync_state").update({ status: "failed", message: error instanceof Error ? error.message.slice(0, 500) : "동기화 실패" }).eq("id", "public-animals");
    throw error;
  }
}

export async function ensurePublicAnimals(options: { allowSync?: boolean } = {}) {
  const allowSync = options.allowSync !== false;
  const schemaChanged = await ensureTables();
  const supabase = getSupabaseServerClient();
  const { data: states } = await supabase.from("public_sync_state").select("*").eq("id", "public-animals").limit(1);
  const state = states?.[0] as ((typeof publicSyncState.$inferSelect) & SyncStateRow | undefined);
  if (!allowSync) return state;
  const { data: existingRows } = await supabase.from("public_animals").select("id").eq("active", true).limit(1);
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
  const storageRow = row as StoredAnimalWithImages;
  const images = [storageRow.image_1_storage || row.image1, storageRow.image_2_storage || row.image2].filter(Boolean);
  return {
    id: row.id, name: row.name, species: row.species, breed: row.breed, upKindCd: row.upKindCd, kindCd: row.kindCd, age: row.age, ageGroup: ageGroup(row.age), sex: row.sex,
    region: row.region, shelter: row.shelterName, shelterId: row.shelterId || undefined, shelterAddress: row.shelterAddress || undefined,
    shelterPhone: row.shelterPhone || undefined, shelterLat: row.shelterLat ?? undefined, shelterLng: row.shelterLng ?? undefined,
    approximateShelterLocation: row.approximateShelterLocation, source: "국가동물보호정보시스템", updated: row.updated,
    image: images[0] || row.image1, images, photoCount: new Set(images).size, colors: jsonArray(row.colorsJson), traits: jsonArray(row.traitsJson),
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
  if (activeAnimalsInFlight) return activeAnimalsInFlight;
  activeAnimalsInFlight = (async () => {
    const { data, error } = await getSupabaseServerClient().from("public_animals").select(LIST_ANIMAL_COLUMNS).eq("active", true).order("updated", { ascending: false }).limit(10000);
    if (error) throw error;
    const rows = (data || []).map(row => storedAnimal(row as Record<string, unknown>));
    activeAnimalsCache = { at: Date.now(), rows };
    return rows;
  })().finally(() => { activeAnimalsInFlight = null; });
  return activeAnimalsInFlight;
}

export async function getBreedCounts(options: BreedCountOptions = {}) {
  const { data: databaseCounts, error: databaseError } = await getSupabaseServerClient().rpc("count_public_animal_breeds", {
    p_species: options.species === "cat" ? "고양이" : options.species === "dog" ? "강아지" : null,
    p_age_group: options.ageGroup === "young" ? "어린 친구" : options.ageGroup === "adult" ? "어른 친구" : options.ageGroup === "unknown" ? "나이 미상" : null,
    p_sex: options.sex === "female" ? "암컷" : options.sex === "male" ? "수컷" : null,
    p_size_group: options.sizeGroup && ["small", "medium", "large", "unknown"].includes(options.sizeGroup) ? options.sizeGroup : null,
    p_public_phase: options.publicStatus === "notice" ? "notice" : options.publicStatus === "checking" ? "checking" : null,
    p_lat: validPoint(Number(options.lat), Number(options.lng)) ? options.lat : null,
    p_lng: validPoint(Number(options.lat), Number(options.lng)) ? options.lng : null,
    p_max_distance_meters: options.maxDistance || null,
  });
  if (!databaseError && databaseCounts) return Object.fromEntries((databaseCounts as Array<Record<string, unknown>>).map(row => [`${row.up_kind_cd}:${row.kind_cd}`, { count: Number(row.animal_count) || 0, kindNm: String(row.kind_name || "품종 미상"), species: row.species === "고양이" ? "cat" : "dog" }])) as Record<string, { count: number; kindNm: string; species: "dog" | "cat" }>;
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
    const key = storedBreedKey(row), safeKey = String(key || ""), current = counts[safeKey];
    counts[safeKey] = { count: (current?.count || 0) + 1, kindNm: safeKey.endsWith(":000000") ? "품종 미상" : row.breed, species: safeKey.startsWith("422400:") ? "cat" : "dog" };
  }
  return counts;
}

export async function getPublicRawFilterOptions() {
  const { data: facetData, error: facetError } = await getSupabaseServerClient().rpc("get_public_animal_filter_options");
  if (!facetError && facetData && typeof facetData === "object") return facetData as Record<string, unknown>;

  // 마이그레이션이 아직 적용되지 않은 환경에서만 기존 호환 경로를 사용합니다.
  const { data, error } = await getSupabaseServerClient().from("public_animals")
    .select("up_kind_cd,kind_cd,species,breed,sex,age,colors_json,traits_json,process_state,region")
    .eq("active", true).limit(10000);
  if (error) throw error;
  const sets = { species: new Set<string>(), breeds: new Map<string, { key: string; label: string; species: string }>(), sex: new Set<string>(), colors: new Set<string>(), ages: new Set<string>(), weights: new Set<string>(), states: new Set<string>(), regions: new Set<string>() };
  for (const row of data || []) {
    const item = row as Record<string, unknown>, animalSpecies = String(item.species || "");
    if (animalSpecies) sets.species.add(animalSpecies);
    const upKindCd = String(item.up_kind_cd || ""), kindCd = String(item.kind_cd || ""), breed = String(item.breed || "");
    if (breed) sets.breeds.set(`${upKindCd}:${kindCd}`, { key: `${upKindCd}:${kindCd}`, label: breed, species: animalSpecies });
    for (const [set, value] of [[sets.sex, item.sex], [sets.ages, item.age], [sets.states, item.process_state], [sets.regions, item.region]] as const) if (value) set.add(String(value));
    for (const color of jsonArray(String(item.colors_json || "[]"))) sets.colors.add(color);
    for (const trait of jsonArray(String(item.traits_json || "[]"))) if (/kg/i.test(trait)) sets.weights.add(trait);
  }
  const breedCounts = await getBreedCounts();
  const sorted = (set: Set<string>) => [...set].sort((a, b) => a.localeCompare(b, "ko-KR"));
  const breeds = [...sets.breeds.values()].map(item => ({ ...item, count: breedCounts[item.key]?.count || 0 })).sort((a, b) => b.count - a.count || a.label.localeCompare(b.label, "ko-KR"));
  return { species: sorted(sets.species), breeds, sex: sorted(sets.sex), colors: sorted(sets.colors), ages: sorted(sets.ages), weights: sorted(sets.weights), states: sorted(sets.states), regions: sorted(sets.regions) };
}

export async function syncPublicLostAnimals() {
  return withSyncLock("public-lost-animals", syncPublicLostAnimalsUnlocked);
}

async function syncPublicLostAnimalsUnlocked() {
  const supabase = getSupabaseServerClient(), syncedAt = new Date().toISOString(), syncId = crypto.randomUUID();
  const result = await fetchAllLostAnimals();
  if (!result.complete) throw new Error(`실종 동물 전체 수집이 완료되지 않았습니다. ${result.items.length}/${result.total}`);
  const mappedRows = result.items
    .map((item, index) => mapLostAnimal(item, index, syncedAt))
    .filter((item): item is NonNullable<ReturnType<typeof mapLostAnimal>> => Boolean(item))
    .map(row => ({
      id: row.id,
      legacy_id: row.legacyId || "",
      species: row.species,
      breed: row.breed,
      sex: row.sex,
      age: row.age,
      color: row.color,
      happened_at: row.happenedAt,
      region: row.region,
      address: row.address,
      place: row.place,
      description: row.description,
      image: row.image,
      active: true,
      last_seen_sync: syncId,
      synced_at: syncedAt,
    }));
  // The public API can return the same report more than once across pages.
  // Postgres rejects an upsert batch when two rows target the same conflict key.
  // Keep the last representation of each report ID so one sync cannot fail
  // because of upstream pagination duplicates.
  const uniqueRows = new Map<string, (typeof mappedRows)[number]>();
  for (const row of mappedRows) uniqueRows.set(row.id, row);
  const rows = [...uniqueRows.values()];
  for (const group of chunks(rows, 500)) {
    const { error } = await supabase.from("public_lost_animals").upsert(group, { onConflict: "id" });
    if (error) throw error;
  }
  const { error: deactivateError } = await supabase.from("public_lost_animals").update({ active: false, synced_at: syncedAt }).neq("last_seen_sync", syncId).eq("active", true);
  if (deactivateError) throw deactivateError;
  const cutoff = new Date(Date.now() - ARCHIVE_RETENTION_MS).toISOString();
  const { error: cleanupError } = await supabase.from("public_lost_animals").delete().eq("active", false).lt("synced_at", cutoff);
  if (cleanupError) throw cleanupError;
  return { count: rows.length, pages: result.pages, syncedAt };
}

export async function getStoredLostAnimals(limit = 12): Promise<LostAnimal[]> {
  // 홈의 지역 우선순위를 적용하려면 먼저 전체 활성 후보를 확인해야 합니다.
  // 일부 최신 데이터만 읽고 정렬하면 가까운 지역의 오래된 신고가 누락될 수 있습니다.
  const safeLimit = Math.min(2000, Math.max(1, limit));
  const { data, error } = await getSupabaseServerClient().from("public_lost_animals").select("id,legacy_id,species,breed,sex,age,color,happened_at,region,address,place,description,image").eq("active", true).order("happened_at", { ascending: false }).limit(safeLimit);
  if (error) throw error;
  return (data || []).map(row => ({ id: String(row.id), legacyId: String(row.legacy_id || ""), species: String(row.species), breed: String(row.breed), sex: String(row.sex), age: String(row.age), color: String(row.color), happenedAt: String(row.happened_at), region: String(row.region), address: String(row.address || ""), place: String(row.place || ""), description: String(row.description || ""), image: String(row.image || "") }));
}

export async function getStoredLostAnimalById(id: string) {
  const { data, error } = await getSupabaseServerClient().from("public_lost_animals").select("id,legacy_id,species,breed,sex,age,color,happened_at,region,address,place,description,image").eq("active", true).eq("id", id).limit(1);
  if (error) throw error;
  const row = data?.[0];
  if (!row) return undefined;
  return { id: String(row.id), legacyId: String(row.legacy_id || ""), species: String(row.species), breed: String(row.breed), sex: String(row.sex), age: String(row.age), color: String(row.color), happenedAt: String(row.happened_at), region: String(row.region), address: String(row.address || ""), place: String(row.place || ""), description: String(row.description || ""), image: String(row.image || "") };
}

export const getCachedStoredLostAnimalById = cache(getStoredLostAnimalById);

export async function getNearbyAnimalsPage(options: { lat?: number; lng?: number; species?: string; publicStatus?: string; breedKeys?: string[]; ageGroup?: string; sizeGroup?: string; sex?: string; color?: string; sort?: string; maxDistance?: number; multiplePhotos?: boolean; exactLocation?: boolean; cursor?: string | null; limit?: number } = {}): Promise<AnimalPage> {
  const state = await ensurePublicAnimals({ allowSync: false });
  const limit = Math.min(50, Math.max(1, options.limit || 20));
  const hasHome = validPoint(Number(options.lat), Number(options.lng));
  const canUseDatabaseSearch = true;
  if (canUseDatabaseSearch) {
    const cursor = decodeSearchCursor(options.cursor);
    const sort = options.sort === "distance" && hasHome ? "distance" : "recent";
    const kindCodes = (options.breedKeys || []).map(value => value.split(":")[1]).filter(value => /^\d{6}$/.test(value));
    const { data, error } = await getSupabaseServerClient().rpc("search_public_animals_with_storage", {
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
      p_size_group: options.sizeGroup || null,
      p_multiple_photos: Boolean(options.multiplePhotos),
      p_exact_location: Boolean(options.exactLocation),
      p_max_distance_meters: options.maxDistance && hasHome ? options.maxDistance : null,
    });
    if (!error && data) {
      const items = (data as Array<Record<string, unknown>>).map(row => {
        const animal = fromStored(storedAnimal(row));
        const distance = Number(row.distance_meters);
        return Number.isFinite(distance) ? { ...animal, distanceMeters: distance } : animal;
      });
      const last = data.at(-1) as Record<string, unknown> | undefined;
      const total = Number((data[0] as Record<string, unknown> | undefined)?.total_count || (state as Record<string, unknown> | undefined)?.item_count || 0);
      const nextCursor = data.length === limit && last ? encodeSearchCursor(sort === "distance"
        ? { distanceMeters: Number.isFinite(Number(last.distance_meters)) ? Number(last.distance_meters) : 1e15, id: String(last.id) }
        : { updatedAt: String(last.updated_at || ""), id: String(last.id) }) : null;
      const completedAt = syncCompletedAt(state as SyncStateRow | undefined);
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
  const completedAt = syncCompletedAt(state as SyncStateRow | undefined);
  return { items, total: prepared.length, nextCursor: nextOffset < prepared.length ? nextOffset.toString(36) : null, syncedAt: completedAt, stale: !completedAt || Date.now() - new Date(completedAt).getTime() >= SYNC_INTERVAL_MS * 2 };
}

export async function getStoredAnimalById(id: string) {
  await ensureTables();
  // 상세페이지는 목록에 필요한 컬럼만 읽습니다. 이미지 검증은 동기화 시점에
  // 끝내고, 사용자가 상세페이지를 열 때 원본 이미지를 다시 다운로드하지 않습니다.
  const { data, error } = await getSupabaseServerClient().from("public_animals").select(LIST_ANIMAL_COLUMNS).eq("id", id).limit(1);
  if (error || !data?.[0]) return undefined;
  const animal = fromStored(storedAnimal(data[0] as Record<string, unknown>));
  const images = Array.from(new Set(animal.images || [animal.image].filter(Boolean)));
  return { ...animal, image: images[0] || animal.image, images, photoCount: images.length };
}

export async function getAnimalsByShelterId(shelterId: string, limit = 200) {
  try {
    await ensurePublicAnimals();
    const supabase = getSupabaseServerClient(), safeLimit = Math.min(500, Math.max(1, limit));
    const [{ data, error }, { count: total, error: countError }] = await Promise.all([
      supabase.from("public_animals").select(LIST_ANIMAL_COLUMNS).eq("active", true).eq("shelter_id", shelterId).order("updated", { ascending: false }).limit(safeLimit),
      supabase.from("public_animals").select("id", { count: "exact", head: true }).eq("active", true).eq("shelter_id", shelterId),
    ]);
    if (error || countError) throw error || countError;
    const rows = (data || []).map(row => storedAnimal(row as Record<string, unknown>));
    const items = rows.map(row => {
      const animal = fromStored(row), images = Array.from(new Set(animal.images || [animal.image].filter(Boolean)));
      return { ...animal, image: images[0] || animal.image, images, photoCount: images.length };
    });
    return { items, total: total || 0 };
  } catch {
    // Public shelter metadata can still render when the optional Supabase feed is unavailable.
    return { items: [], total: 0 };
  }
}
