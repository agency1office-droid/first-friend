import type { publicAnimals, publicShelters, publicSyncState } from "../db/schema";
import type { Animal } from "./data";
import type { LostAnimal } from "./public-data";
import { cache } from "react";
import { distanceMeters } from "./geo";
import { matchesAnimalPublicStatus } from "./animal-public-status";
import { getSupabaseServerClient } from "./supabase/server";
import { PUBLIC_ANIMAL_AGE_MAX, PUBLIC_ANIMAL_WEIGHT_MAX } from "./animal-filter-ranges";
import { lostFreshnessCutoff, lostHappenedOn, type LostRegionQuery } from "./lost-region";

const ANIMAL_ENDPOINT = "https://apis.data.go.kr/1543061/abandonmentPublicService_v2/abandonmentPublic_v2";
const SHELTER_ENDPOINT = "https://apis.data.go.kr/1543061/animalShelterSrvc_v2/shelterInfo_v2";
const LOSS_ENDPOINT = "https://apis.data.go.kr/1543061/lossInfoService/lossInfo";
const PAGE_SIZE = 1000;
const MAX_PAGES = 50;
const MAX_LOST_PAGES = 200;
const API_RETRY_COUNT = 3;
const STALE_DATA_MS = 48 * 60 * 60 * 1000;
const ARCHIVE_RETENTION_MS = 365 * 24 * 60 * 60 * 1000;

type Envelope<T> = { response?: { header?: { resultCode?: string; resultMsg?: string }; body?: { items?: { item?: T | T[] }; totalCount?: number | string } } };
type AnimalItem = { desertionNo?: string; happenDt?: string; kindFullNm?: string; upKindCd?: string; upKindNm?: string; kindCd?: string; kindNm?: string; colorCd?: string; age?: string; weight?: string; noticeNo?: string; noticeSdt?: string; noticeEdt?: string; popfile1?: string; popfile2?: string; processState?: string; sexCd?: string; neuterYn?: string; specialMark?: string; careRegNo?: string; careNm?: string; careTel?: string; careAddr?: string; orgNm?: string; updTm?: string };
type LossItem = { happenDt?: string; happenAddr?: string; happenPlace?: string; orgNm?: string; popfile?: string; kindCd?: string; sexCd?: string; age?: string; colorCd?: string; specialMark?: string; rfidCd?: string };
type ShelterItem = { careRegNo?: string; careNm?: string; orgNm?: string; careAddr?: string; careTel?: string; weekOprStime?: string; weekOprEtime?: string; closeDay?: string; lat?: string; lng?: string };
type ShelterRecord = typeof publicShelters.$inferInsert;
type AnimalRecord = Omit<typeof publicAnimals.$inferInsert, "ageGroup"> & { ageGroup: Animal["ageGroup"]; noticeNo?: string };
type StoredAnimal = typeof publicAnimals.$inferSelect & { image1Storage?: string; image2Storage?: string };

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

let activeAnimalsInFlight: Promise<StoredAnimal[]> | null = null;
const LIST_ANIMAL_COLUMNS = "id,name,species,breed,up_kind_cd,kind_cd,age,age_group,sex,region,shelter_id,shelter_name,shelter_address,shelter_phone,shelter_lat,shelter_lng,approximate_shelter_location,updated,updated_at,image_1,image_2,image_1_storage,image_2_storage,colors_json,traits_json,summary,health_json,life_json,match_reason,process_state,active,last_seen_sync,synced_at,size_group,has_multiple_photos,has_exact_location,color_search,public_phase";
type SyncStateRow = { lastCompletedAt?: string | null; last_completed_at?: string | null };

function apiKey() { return process.env.PUBLIC_DATA_API_KEY?.trim(); }
function array<T>(value: T | T[] | undefined) { return !value ? [] : Array.isArray(value) ? value : [value]; }
function secureImage(value = "") { return value.replace(/^http:\/\//, "https://"); }
function compactDate(value = "") { const digits = value.replace(/\D/g, "").slice(0, 8); return digits.length === 8 ? `${digits.slice(0, 4)}. ${Number(digits.slice(4, 6))}. ${Number(digits.slice(6, 8))}.` : value; }
function isoDate(value = "") { const match = value.match(/(\d{4})\D+(\d{1,2})\D+(\d{1,2})/); if (!match) return null; const date = new Date(Date.UTC(Number(match[1]), Number(match[2]) - 1, Number(match[3]))); return Number.isNaN(date.getTime()) ? null : date.toISOString(); }
function sex(value = "") { return value === "M" ? "수컷" : value === "F" ? "암컷" : "미상"; }
function species(item: AnimalItem) { return item.upKindNm || item.kindFullNm?.match(/^\[([^\]]+)/)?.[1] || "기타"; }
function supported(value: string) { return /고양이|개|강아지/.test(value) && !/기타/.test(value); }
function ageGroup(value = ""): Animal["ageGroup"] {
  if (value.includes("60일미만")) return "어린 친구";
  const months = Number(value.match(/(\d+(?:\.\d+)?)\s*개월/)?.[1]);
  if (Number.isFinite(months)) return months < 12 ? "어린 친구" : months < 72 ? "청년 친구" : months < 132 ? "어른 친구" : "나이 많은 친구";
  const born = Number(value.match(/(19|20)\d{2}/)?.[0]);
  const years = Number(value.match(/(\d+(?:\.\d+)?)\s*살/)?.[1]);
  const age = Number.isFinite(years) ? years : born ? new Date().getFullYear() - born : undefined;
  if (age === undefined || age < 0) return "나이 미상";
  return age <= 1 ? "어린 친구" : age <= 5 ? "청년 친구" : age <= 10 ? "어른 친구" : "나이 많은 친구";
}
function lostSpecies(value = "") { const text = value.trim().toLocaleLowerCase("ko-KR"); if (/고양이|묘|러시안\s*블루|랙돌|페르시안|샴|스코티시|메인쿤|먼치킨|스핑크스/.test(text)) return "고양이"; if (/견|강아지|^개$|말티즈|푸들|포메라니안|비숑|치와와|시츄|진돗개|리트리버|스피츠|테리어|불독|닥스훈트|비글|웰시코기/.test(text)) return "강아지"; return "기타"; }
function lostSex(value = "") { return value === "M" ? "수컷" : value === "F" ? "암컷" : "미상"; }
function lostDate(value = "") {
  const raw = value.replace(/\.0$/, "").trim();
  const match = raw.match(/^(\d{4})[-.](\d{1,2})[-.](\d{1,2})(?:[ T](\d{1,2}):?(\d{2})?(?::\d{2})?)?$/);
  if (!match) return raw || "발생일 미상";
  const [, year, month, day, hourText, minuteText] = match;
  if (hourText === undefined) return `${year}년 ${Number(month)}월 ${Number(day)}일`;
  const hour = Number(hourText);
  const period = hour >= 12 ? "오후" : "오전";
  const displayHour = hour % 12 || 12;
  const minute = minuteText && Number(minuteText) > 0 ? ` ${Number(minuteText)}분` : "";
  return `${year}년 ${Number(month)}월 ${Number(day)}일 ${period} ${displayHour}시${minute}`;
}
function lostPlace(address = "", happenPlace = "", region = "") {
  const addressValue = address.trim(), placeValue = happenPlace.trim();
  const normalize = (value: string) => value.replace(/[\s,·()[\]{}]/g, "").toLocaleLowerCase("ko-KR");
  if (!addressValue && !placeValue) return `${region || "관할 지역"} 인근`;
  if (!placeValue || normalize(addressValue).includes(normalize(placeValue)) || normalize(placeValue).includes(normalize(addressValue))) return addressValue || placeValue;
  return [addressValue, placeValue].filter(Boolean).join(" · ");
}
function missingHappenPlaceColumn(error: { code?: string; message?: string } | null) {
  return error?.code === "42703" && /happen_place|rfid_cd|happened_on/i.test(error.message || "");
}
function mapLostAnimal(item: LossItem, index: number, syncedAt: string) {
  const id = item.rfidCd?.trim() || `${item.happenDt || "loss"}-${index}`;
  const species = lostSpecies(item.kindCd);
  if (!item.popfile || species === "기타") return null;
  return { id, legacyId: `${item.happenDt || "loss"}-${index}`, rfidCd: item.rfidCd?.trim() || undefined, species, breed: item.kindCd || "품종 미상", sex: lostSex(item.sexCd), age: item.age || "나이 미상", color: item.colorCd || "털색 미상", happenedAt: lostDate(item.happenDt), happenedOn: lostHappenedOn(item.happenDt), region: item.orgNm || "지역 미상", address: item.happenAddr || "", place: lostPlace(item.happenAddr || "", item.happenPlace || "", item.orgNm || ""), happenPlace: item.happenPlace?.trim() || undefined, description: item.specialMark || "등록된 특징이 없습니다.", image: secureImage(item.popfile), active: true, synced_at: syncedAt };
}
function displayName(item: AnimalItem) { return [item.kindNm || species(item), item.noticeNo?.split("-").at(-1)].filter(Boolean).join(" · "); }
function validPoint(lat: number, lng: number) { return Number.isFinite(lat) && Number.isFinite(lng) && lat > 30 && lat < 40 && lng > 120 && lng < 135; }
function jsonArray(value: string) { try { const result = JSON.parse(value); return Array.isArray(result) ? result.map(String) : []; } catch { return []; } }
function weightKg(row: { traitsJson?: string | null }) { const value = jsonArray(row.traitsJson || "[]").find(item => /kg/i.test(item)); if (!value) return undefined; const values = [...value.matchAll(/\d+(?:\.\d+)?/g)].map(match => Number(match[0])).filter(number => number > 0 && number <= 150); return values.length ? values.reduce((sum, number) => sum + number, 0) / values.length : undefined; }
const breedSizeHints: Record<string, string[]> = {
  small: ["치와와", "말티즈", "포메라니안", "요크셔", "토이 푸들", "미니어쳐 푸들", "미니어쳐 핀셔", "빠삐용", "파피용", "이탈리안 그레이 하운드", "페키니즈", "시츄", "싱가푸라"],
  medium: ["비숑", "프렌치 불독", "보스턴 테리어", "시바", "코카 스파니엘", "아메리칸 코카", "스탠다드 닥스훈트", "웰시 코기", "진도견", "진돗개", "샴", "먼치킨", "스코티시폴드", "러시안 블루", "아메리칸 쇼트헤어", "브리티시 쇼트헤어", "페르시안", "터키시 앙고라"],
  large: ["보더 콜리", "푸들", "스피츠", "골든 리트리버", "라브라도", "래브라도", "셰퍼드", "도베르만", "포인터", "사모예드", "시베리안 허스키", "허스키", "마리노이즈", "콜리", "플랫 코티드 리트리버", "비즐라", "샤페이", "벵갈"],
  xlarge: ["말라뮤트", "알래스칸 맬러뮤트", "도사", "그레이트 데인", "마스티프", "세인트 버나드", "뉴펀들랜드", "로트와일러", "버니즈", "메인쿤", "랙돌", "노르웨이숲", "사바나"],
};
function hintedSizeGroup(breed: string) {
  const normalized = String(breed || "").replace(/[\s·()_-]/g, "").toLocaleLowerCase("ko-KR");
  for (const [group, hints] of Object.entries(breedSizeHints)) if (hints.some(hint => normalized.includes(hint.replace(/[\s·()_-]/g, "").toLocaleLowerCase("ko-KR")))) return group;
  return undefined;
}
function sizeGroup(row: { traitsJson?: string | null; species: string; breed?: string | null }) {
  const hinted = hintedSizeGroup(row.breed || "");
  if (hinted) return hinted;
  const weight = weightKg(row);
  if (weight === undefined) return "unknown";
  if (row.species === "고양이") return weight < 3 ? "small" : weight < 6 ? "medium" : weight < 10 ? "large" : "xlarge";
  return weight < 5 ? "small" : weight < 15 ? "medium" : weight < 30 ? "large" : "xlarge";
}

function storedBreedKey(row: StoredAnimal) { const upKindCd = /^(417000|422400)$/.test(row.upKindCd) ? row.upKindCd : row.species === "고양이" ? "422400" : "417000"; const kindCd = /^\d{6}$/.test(row.kindCd) ? row.kindCd : "000000"; return `${upKindCd}:${kindCd}`; }
function chunks<T>(items: T[], size: number) { const result: T[][] = []; for (let index = 0; index < items.length; index += size) result.push(items.slice(index, index + size)); return result; }
function syncCompletedAt(state: SyncStateRow | undefined) { return state?.lastCompletedAt || state?.last_completed_at || null; }
function csvValues(value = "") { return value === "all" ? [] : value.split(",").map(item => item.trim()).filter(Boolean); }
const ageGroupAliases: Record<string, string[]> = {
  young: ["어린 친구", "아기"],
  adult: ["청년 친구", "성장기"],
  mature: ["어른 친구", "어른"],
  senior: ["나이 많은 친구", "노령"],
  unknown: ["나이 미상", "미상"],
};
function ageRpcFilter(value = "") { return [...new Set(csvValues(value).flatMap(item => ageGroupAliases[item] || []))].join(",") || null; }
function sexRpcFilter(value = "") { const labels: Record<string, string> = { female: "암컷", male: "수컷", unknown: "미상" }; return csvValues(value).map(item => labels[item]).filter(Boolean).join(",") || null; }

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
    image1: row.image_1 || "",
    image2: row.image_2 || "",
    image1Storage: row.image_1_storage || "",
    image2Storage: row.image_2_storage || "",
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
    id: row.id, notice_no: row.noticeNo || "", name: row.name, species: row.species, breed: row.breed, up_kind_cd: row.upKindCd, kind_cd: row.kindCd,
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
  const rawTotal = payload.response.body?.totalCount;
  const total = Number(rawTotal);
  if (rawTotal === undefined || rawTotal === null || rawTotal === "" || !Number.isSafeInteger(total) || total < 0) throw new Error("공공데이터 전체 건수가 올바르지 않습니다.");
  return { items: array(payload.response.body?.items?.item), total };
}

function retryableApiError(error: unknown) {
  const message = error instanceof Error ? error.message : String(error);
  return /timeout|응답 오류 (429|5\d\d)|temporar|network|fetch failed/i.test(message);
}

async function fetchPageWithRetry<T>(endpoint: string, pageNo: number, numOfRows: number, extraParams: Record<string, string> = {}) {
  let lastError: unknown;
  for (let attempt = 0; attempt < API_RETRY_COUNT; attempt += 1) {
    try {
      return await fetchPage<T>(endpoint, pageNo, numOfRows, extraParams);
    } catch (error) {
      lastError = error;
      if (!retryableApiError(error) || attempt === API_RETRY_COUNT - 1) throw error;
      await new Promise(resolve => setTimeout(resolve, 250 * (2 ** attempt) + Math.floor(Math.random() * 150)));
    }
  }
  throw lastError instanceof Error ? lastError : new Error("공공데이터 API 요청에 실패했습니다.");
}

type FetchAllResult<T> = { items: T[]; pages: number; total: number; complete: boolean };

async function fetchAll<T>(endpoint: string, options: { stopOnShortPage?: boolean } = {}): Promise<FetchAllResult<T>> {
  const items: T[] = [];
  const seenPages = new Set<string>();
  let page = 1, total = 0;
  let endedByShortPage = false;
  while (page <= MAX_PAGES) {
    const result = await fetchPageWithRetry<T>(endpoint, page, PAGE_SIZE);
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
    const result = await fetchPageWithRetry<AnimalItem>(ANIMAL_ENDPOINT, page, PAGE_SIZE);
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
    noticeNo: item.noticeNo || "",
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
    lifeJson: JSON.stringify([notice, `발견 지역: ${(item.orgNm || "관할 지역").split(" ").slice(0, 2).join(" ")} 인근`, "성격과 건강 상태는 보호센터 상담을 통해 확인해 주세요"]),
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
}

async function compactExpiredAnimals(supabase: ReturnType<typeof getSupabaseServerClient>, now: string) {
  const cutoff = new Date(Date.now() - ARCHIVE_RETENTION_MS).toISOString();
  const { data: expired, error } = await supabase.from("public_animals")
    .select("id")
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

  if (deletable.length) {
    const { error: deleteError } = await supabase.from("public_animals").delete().in("id", deletable.map(row => String(row.id)));
    if (deleteError) throw deleteError;
  }
  if (retained.length) {
    const { error: compactError } = await supabase.from("public_animals").update({
      image_1: "",
      image_2: "",
      summary: "공공데이터 공고가 종료된 친구예요.",
      health_json: "[]",
      life_json: "[\"공고가 종료되어 현재 입양 가능 여부를 확인할 수 없어요.\"]",
      match_reason: "",
      process_state: "종료 공고",
      synced_at: now,
    }).in("id", retained.map(row => String(row.id)));
    if (compactError) throw compactError;
  }
  return { deleted: deletable.length, compacted: retained.length };
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
    if (animalsResult.count === 0) throw new Error("수집된 동물이 0건이므로 기존 동물 정보를 유지합니다. 공공데이터 응답을 확인해야 합니다.");
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
  void options;
  await ensureTables();
  const supabase = getSupabaseServerClient();
  const { data: states } = await supabase.from("public_sync_state").select("*").eq("id", "public-animals").limit(1);
  const state = states?.[0] as ((typeof publicSyncState.$inferSelect) & SyncStateRow | undefined);
  // 보호소 데이터 갱신은 Vercel Cron에서 하루 한 번만 수행합니다.
  // 페이지 요청에서는 저장된 DB 상태만 읽고 공공 API를 호출하지 않습니다.
  return state;
}

function fromStored(row: StoredAnimal): Animal {
  const images = [row.image1, row.image2].filter(Boolean);
  return {
    id: row.id, name: row.name, species: row.species, breed: row.breed, upKindCd: row.upKindCd, kindCd: row.kindCd, age: row.age, ageGroup: ageGroup(row.age), sex: row.sex,
    region: row.region, shelter: row.shelterName, shelterId: row.shelterId || undefined, shelterAddress: row.shelterAddress || undefined,
    shelterPhone: row.shelterPhone || undefined, shelterLat: row.shelterLat ?? undefined, shelterLng: row.shelterLng ?? undefined,
    approximateShelterLocation: row.approximateShelterLocation, source: "국가동물보호정보시스템", updated: row.updated,
    image: images[0] || row.image1, thumbnail: (row.image1 ? row.image1Storage : row.image2Storage)?.includes("/thumb-v1/") ? (row.image1 ? row.image1Storage : row.image2Storage) : undefined,
    images, photoCount: new Set(images).size, colors: jsonArray(row.colorsJson), traits: jsonArray(row.traitsJson),
    summary: row.summary, health: jsonArray(row.healthJson), life: jsonArray(row.lifeJson), matchReason: row.matchReason,
  };
}

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
  if (activeAnimalsInFlight) return activeAnimalsInFlight;
  activeAnimalsInFlight = (async () => {
    const { data, error } = await getSupabaseServerClient().from("visible_public_animals").select(LIST_ANIMAL_COLUMNS).eq("active", true).order("updated", { ascending: false }).limit(10000);
    if (error) throw error;
    const rows = (data || []).map(row => storedAnimal(row as Record<string, unknown>));
    return rows;
  })().finally(() => { activeAnimalsInFlight = null; });
  return activeAnimalsInFlight;
}

export async function getBreedCounts(options: BreedCountOptions = {}) {
  const canUseFacetRpc = csvValues(options.ageGroup).length <= 1 && csvValues(options.sizeGroup).length <= 1 && csvValues(options.sex).length <= 1;
  const { data: databaseCounts, error: databaseError } = canUseFacetRpc ? await getSupabaseServerClient().rpc("count_public_animal_breeds", {
    p_species: options.species === "cat" ? "고양이" : options.species === "dog" ? "강아지" : null,
    p_age_group: ageRpcFilter(options.ageGroup),
    p_sex: sexRpcFilter(options.sex),
    p_size_group: csvValues(options.sizeGroup).filter(value => ["small", "medium", "large", "xlarge", "unknown"].includes(value)).join(",") || null,
    p_public_phase: options.publicStatus === "notice" ? "notice" : options.publicStatus === "checking" ? "checking" : null,
    p_lat: validPoint(Number(options.lat), Number(options.lng)) ? options.lat : null,
    p_lng: validPoint(Number(options.lat), Number(options.lng)) ? options.lng : null,
    p_max_distance_meters: options.maxDistance || null,
  }) : { data: null, error: new Error("multi-value filters use local facet counting") };
  if (!databaseError && databaseCounts) return Object.fromEntries((databaseCounts as Array<Record<string, unknown>>).map(row => [`${row.up_kind_cd}:${row.kind_cd}`, { count: Number(row.animal_count) || 0, kindNm: String(row.kind_name || "품종 미상"), species: row.species === "고양이" ? "cat" : "dog" }])) as Record<string, { count: number; kindNm: string; species: "dog" | "cat" }>;
  await ensurePublicAnimals();
  const rows = await activeAnimals();
  const hasHome = validPoint(Number(options.lat), Number(options.lng));
  const ageFilter = new Set(csvValues(options.ageGroup).map(value => ({ young: "어린 친구", adult: "청년 친구", mature: "어른 친구", senior: "나이 많은 친구", unknown: "나이 미상" } as Record<string, string>)[value]).filter(Boolean));
  const sizeFilter = new Set(csvValues(options.sizeGroup).filter(value => ["small", "medium", "large", "xlarge", "unknown"].includes(value)));
  const sexFilter = new Set<string>(csvValues(options.sex).map(value => value === "female" ? "암컷" : value === "male" ? "수컷" : value === "unknown" ? "미상" : "").filter(Boolean));
  const counts: Record<string, { count: number; kindNm: string; species: "dog" | "cat" }> = {};
  for (const row of rows) {
    if ((ageFilter.size && !ageFilter.has(ageGroup(row.age))) || (sizeFilter.size && !sizeFilter.has(sizeGroup(row))) || (sexFilter.size && !sexFilter.has(row.sex))) continue;
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
  if (!facetError && facetData && typeof facetData === "object") {
    const data = facetData as Record<string, unknown>;
    const breeds = Array.isArray(data.breeds) ? data.breeds.map(item => {
      const breed = item as Record<string, unknown>;
      return { ...breed, species: breed.species === "고양이" || breed.species === "cat" ? "cat" : "dog" };
    }) : [];
    return { ...data, breeds };
  }

  // 마이그레이션이 아직 적용되지 않은 환경에서만 기존 호환 경로를 사용합니다.
  const { data, error } = await getSupabaseServerClient().from("visible_public_animals")
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
  const supabase = getSupabaseServerClient(), syncedAt = new Date().toISOString();
  const now = new Date(), endDate = `${now.getUTCFullYear()}${String(now.getUTCMonth() + 1).padStart(2, "0")}${String(now.getUTCDate()).padStart(2, "0")}`;
  const start = new Date(now); start.setUTCFullYear(start.getUTCFullYear() - 1);
  const startDate = `${start.getUTCFullYear()}${String(start.getUTCMonth() + 1).padStart(2, "0")}${String(start.getUTCDate()).padStart(2, "0")}`;
  const deadline = Date.now() + 200_000;
  type Checkpoint = { syncId: string; startDate: string; endDate: string; nextPage: number; count: number; total: number; updatedAt: string; error?: string };
  const { data: state } = await supabase.from("public_sync_state").select("status,message,last_started_at").eq("id", "public-lost-animals").maybeSingle();
  let checkpoint: Checkpoint | null = null;
  try {
    const parsed = JSON.parse(String(state?.message || "")) as Checkpoint;
    if (state?.status !== "complete" && parsed.syncId && /^\d{8}$/.test(parsed.startDate) && /^\d{8}$/.test(parsed.endDate) && Number.isInteger(parsed.nextPage) && parsed.nextPage > 0 && parsed.nextPage <= MAX_LOST_PAGES && Date.now() - new Date(parsed.updatedAt).getTime() < 7 * 24 * 60 * 60 * 1000) checkpoint = parsed;
  } catch { checkpoint = null; }
  const syncId = checkpoint?.syncId || crypto.randomUUID();
  let page = checkpoint?.nextPage || 1, count = checkpoint?.count || 0, total = checkpoint?.total || 0, pages = Math.max(0, page - 1);
  const seenIds = new Set<string>();
  const rangeStart = checkpoint?.startDate || startDate, rangeEnd = checkpoint?.endDate || endDate;
  const dateParams = { bgnde: rangeStart, endde: rangeEnd };
  const checkpointMessage = (error?: string) => JSON.stringify({ syncId, startDate: rangeStart, endDate: rangeEnd, nextPage: page, count, total, updatedAt: new Date().toISOString(), ...(error ? { error } : {}) } satisfies Checkpoint);
  const writeState = async (status: string, message: string) => {
    const { error } = await supabase.from("public_sync_state").upsert({ id: "public-lost-animals", status, last_started_at: syncedAt, item_count: count, page_count: pages, message }, { onConflict: "id" });
    if (error) throw error;
  };
  try {
    await writeState("running", checkpointMessage());
    while (page <= MAX_LOST_PAGES) {
      if (Date.now() >= deadline) {
        await writeState("running", checkpointMessage());
        return { count, pages, syncedAt, complete: false, nextPage: page };
      }
      const result = await fetchPageWithRetry<LossItem>(LOSS_ENDPOINT, page, 100, dateParams);
      const current = result.items.filter(Boolean);
      total = result.total;
      const uniqueRows = new Map<string, ReturnType<typeof mapLostAnimal>>();
      current.forEach((item, index) => {
        const row = mapLostAnimal(item, (page - 1) * 100 + index, syncedAt);
        if (row && !seenIds.has(row.id)) {
          seenIds.add(row.id);
          uniqueRows.set(row.id, row);
        }
      });
      const rows = [...uniqueRows.values()].map(row => ({
        id: row!.id, legacy_id: row!.legacyId || "", rfid_cd: row!.rfidCd || "", species: row!.species, breed: row!.breed, sex: row!.sex, age: row!.age,
        color: row!.color, happened_at: row!.happenedAt, happened_on: row!.happenedOn, region: row!.region, address: row!.address, place: row!.place, happen_place: row!.happenPlace || "",
        description: row!.description, image: row!.image, active: true, last_seen_sync: syncId, synced_at: syncedAt,
      }));
      if (rows.length) {
        let { error } = await supabase.from("public_lost_animals").upsert(rows, { onConflict: "id" });
        // 마이그레이션 전 DB에서도 기존 place 값으로 동기화가 중단되지 않게 합니다.
        if (missingHappenPlaceColumn(error)) {
          const legacyRows = rows.map((row) => {
            const legacyRow: Record<string, unknown> = { ...row };
            delete legacyRow.happen_place;
            delete legacyRow.rfid_cd;
            delete legacyRow.happened_on;
            return legacyRow;
          });
          ({ error } = await supabase.from("public_lost_animals").upsert(legacyRows, { onConflict: "id" }));
        }
        if (error) throw error;
        count += rows.length;
      }
      pages = page;
      page += 1;
      const done = !current.length || (total === 0 && current.length < 100) || (total > 0 && (page - 1) * 100 >= total);
      if (!current.length && total > 0 && (page - 1) * 100 < total) {
        page -= 1;
        throw new Error(`실종 동물 응답이 중간에 비었습니다. ${count}/${total}`);
      }
      await writeState("running", checkpointMessage());
      if (done) break;
    }
    if (page > MAX_LOST_PAGES + 1 || (total > 0 && (page - 1) * 100 < total)) throw new Error(`실종 동물 전체 수집이 완료되지 않았습니다. ${count}/${total}`);
    if (count === 0) throw new Error("수집된 실종 동물이 0건이므로 기존 정보를 유지합니다.");
    const { error: deactivateError } = await supabase.from("public_lost_animals").update({ active: false, synced_at: syncedAt }).neq("last_seen_sync", syncId).eq("active", true);
    if (deactivateError) throw deactivateError;
    const cutoff = new Date(Date.now() - ARCHIVE_RETENTION_MS).toISOString();
    const { error: cleanupError } = await supabase.from("public_lost_animals").delete().eq("active", false).lt("synced_at", cutoff);
    if (cleanupError) throw cleanupError;
    await supabase.from("public_sync_state").update({ status: "complete", last_completed_at: syncedAt, item_count: count, page_count: pages, message: "" }).eq("id", "public-lost-animals").throwOnError();
    return { count, pages, syncedAt, complete: true };
  } catch (error) {
    const message = error instanceof Error ? error.message.slice(0, 500) : "실종 동물 동기화 실패";
    await writeState("failed", checkpointMessage(message));
    throw error;
  }
}

function storedLostAnimal(row: Record<string, unknown>): LostAnimal {
  const address = String(row.address || ""), happenPlace = String(row.happen_place || "").trim(), region = String(row.region || "");
  const storedPlace = String(row.place || "").replace(/\s*·\s*상세 위치 비공개\s*$/, "");
  return { id: String(row.id), legacyId: String(row.legacy_id || ""), rfidCd: String(row.rfid_cd || "").trim() || undefined, species: String(row.species), breed: String(row.breed), sex: String(row.sex), age: String(row.age), color: String(row.color), happenedAt: lostDate(String(row.happened_at)), region, address, place: happenPlace ? lostPlace(address, happenPlace, region) : (storedPlace || lostPlace(address, "", region)), happenPlace: happenPlace || undefined, description: String(row.description || ""), image: String(row.image || ""), updated: compactDate(String(row.synced_at || "")) };
}

// 생활권 상한과 정렬은 모두 RPC가 계산합니다. 여기서는 파싱된 값을 그대로 넘깁니다.
export async function getNearbyStoredLostAnimals(query: LostRegionQuery, limit = 8): Promise<LostAnimal[]> {
  const { data, error } = await getSupabaseServerClient().rpc("search_public_lost_animals_nearby", {
    p_provinces: query.provinces,
    p_prefix: query.prefix,
    p_dong: query.dong,
    p_limit: Math.min(20, Math.max(1, limit)),
  });
  if (error) throw error;
  return ((data || []) as Array<Record<string, unknown>>).map(storedLostAnimal);
}

export async function getStoredLostAnimals(limit = 12): Promise<LostAnimal[]> {
  const safeLimit = Math.min(100, Math.max(1, limit));
  const supabase = getSupabaseServerClient();
  const cutoff = lostFreshnessCutoff();
  // 발생일이 오래된 공고는 제보로 이어지지 않아 노출하지 않습니다.
  let { data, error } = await supabase.from("public_lost_animals").select("id,legacy_id,rfid_cd,species,breed,sex,age,color,happened_at,happened_on,region,address,place,happen_place,description,image,synced_at").eq("active", true).or(`happened_on.is.null,happened_on.gte.${cutoff}`).order("happened_on", { ascending: false, nullsFirst: false }).limit(safeLimit);
  if (missingHappenPlaceColumn(error)) {
    const legacy = await supabase.from("public_lost_animals").select("id,legacy_id,species,breed,sex,age,color,happened_at,region,address,place,description,image,synced_at").eq("active", true).order("happened_at", { ascending: false }).limit(safeLimit);
    data = legacy.data?.map(row => ({ ...row, rfid_cd: "", happen_place: "", happened_on: null })) ?? null;
    error = legacy.error;
  }
  if (error) throw error;
  return (data || []).map(row => storedLostAnimal(row as Record<string, unknown>));
}

export async function getStoredLostAnimalById(id: string) {
  const supabase = getSupabaseServerClient();
  let { data, error } = await supabase.from("public_lost_animals").select("id,legacy_id,rfid_cd,species,breed,sex,age,color,happened_at,region,address,place,happen_place,description,image,synced_at").eq("active", true).eq("id", id).limit(1);
  if (missingHappenPlaceColumn(error)) {
    const legacy = await supabase.from("public_lost_animals").select("id,legacy_id,species,breed,sex,age,color,happened_at,region,address,place,description,image,synced_at").eq("active", true).eq("id", id).limit(1);
    data = legacy.data?.map(row => ({ ...row, rfid_cd: "", happen_place: "" })) ?? null;
    error = legacy.error;
  }
  if (error) throw error;
  const row = data?.[0];
  if (!row) return undefined;
  const address = String(row.address || ""), happenPlace = String(row.happen_place || "").trim(), region = String(row.region || "");
  const storedPlace = String(row.place || "").replace(/\s*·\s*상세 위치 비공개\s*$/, "");
  return { id: String(row.id), legacyId: String(row.legacy_id || ""), rfidCd: String(row.rfid_cd || "").trim() || undefined, species: String(row.species), breed: String(row.breed), sex: String(row.sex), age: String(row.age), color: String(row.color), happenedAt: lostDate(String(row.happened_at)), region, address, place: happenPlace ? lostPlace(address, happenPlace, region) : (storedPlace || lostPlace(address, "", region)), happenPlace: happenPlace || undefined, description: String(row.description || ""), image: String(row.image || ""), updated: compactDate(String(row.synced_at || "")) };
}

export const getCachedStoredLostAnimalById = cache(getStoredLostAnimalById);

export async function getStoredLostAnimalsByIds(ids: string[]): Promise<LostAnimal[]> {
  if (!ids.length) return [];
  const client = getSupabaseServerClient();
  let { data, error } = await client.from("public_lost_animals").select("id,legacy_id,rfid_cd,species,breed,sex,age,color,happened_at,region,address,place,happen_place,description,image,synced_at").eq("active", true).in("id", ids);
  if (missingHappenPlaceColumn(error)) {
    const legacy = await client.from("public_lost_animals").select("id,legacy_id,species,breed,sex,age,color,happened_at,region,address,place,description,image,synced_at").eq("active", true).in("id", ids);
    data = legacy.data?.map(row => ({ ...row, rfid_cd: "", happen_place: "" })) ?? null;
    error = legacy.error;
  }
  if (error) throw error;
  return (data || []).map(row => storedLostAnimal(row as Record<string, unknown>));
}

export async function getNearbyAnimalsPage(options: { lat?: number; lng?: number; species?: string; publicStatus?: string; breedKeys?: string[]; ageGroup?: string; sizeGroup?: string; sex?: string; neutered?: string; ageMin?: number; ageMax?: number; weightMin?: number; weightMax?: number; color?: string; sort?: string; maxDistance?: number; multiplePhotos?: boolean; exactLocation?: boolean; cursor?: string | null; limit?: number } = {}): Promise<AnimalPage> {
  const limit = Math.min(50, Math.max(1, options.limit || 20));
  const hasHome = validPoint(Number(options.lat), Number(options.lng));
  const cursor = decodeSearchCursor(options.cursor);
  const sort = options.sort === "distance" && hasHome ? "distance" : "recent";
  const kindCodes = (options.breedKeys || []).map(value => value.split(":")[1]).filter(value => /^\d{6}$/.test(value));
  const [{ data, error }, state] = await Promise.all([
    getSupabaseServerClient().rpc("search_public_animals_filtered_with_storage", {
      p_limit: limit,
      p_cursor_updated_at: cursor?.updatedAt || null,
      p_cursor_id: cursor?.id || null,
      p_cursor_distance_meters: cursor?.distanceMeters ?? null,
      p_lat: hasHome ? options.lat : null,
      p_lng: hasHome ? options.lng : null,
      p_sort: sort,
      p_species: options.species === "cat" ? "고양이" : options.species === "dog" ? "강아지" : null,
      p_age_group: ageRpcFilter(options.ageGroup),
      p_sex: sexRpcFilter(options.sex),
      p_kind_codes: kindCodes.length ? kindCodes : null,
      p_color: options.color && options.color !== "all" ? options.color : null,
      p_public_phase: options.publicStatus === "notice" ? "notice" : options.publicStatus === "checking" ? "checking" : null,
      p_size_group: csvValues(options.sizeGroup).filter(value => ["small", "medium", "large", "xlarge", "unknown"].includes(value)).join(",") || null,
      p_multiple_photos: Boolean(options.multiplePhotos),
      p_exact_location: Boolean(options.exactLocation),
      p_max_distance_meters: options.maxDistance && hasHome ? options.maxDistance : null,
      p_neutered: csvValues(options.neutered).filter(value => value === "yes" || value === "no").join(",") || null,
      p_age_min: options.ageMin ?? 0,
      p_age_max: options.ageMax ?? PUBLIC_ANIMAL_AGE_MAX,
      p_weight_min: options.weightMin ?? 0,
      p_weight_max: options.weightMax ?? PUBLIC_ANIMAL_WEIGHT_MAX,
    }),
    ensurePublicAnimals({ allowSync: false }),
  ]);
  if (error) throw new Error(error.message || "보호동물 검색을 잠시 사용할 수 없습니다.");
  const rows = (data || []) as Array<Record<string, unknown>>;
  const items = rows.map(row => {
    const animal = fromStored(storedAnimal(row));
    return row.distance_meters != null && Number.isFinite(Number(row.distance_meters))
      ? { ...animal, distanceMeters: Number(row.distance_meters) } : animal;
  });
  const last = rows.at(-1);
  const nextCursor = rows.length === limit && last ? encodeSearchCursor(sort === "distance"
    ? { distanceMeters: last.distance_meters == null ? 1e15 : Number(last.distance_meters), id: String(last.id) }
    : { updatedAt: String(last.updated_at || ""), id: String(last.id) }) : null;
  const completedAt = syncCompletedAt(state as SyncStateRow | undefined);
  // A successful empty SQL result is final, including a cursor beyond the last row.
  return { items, total: Number(rows[0]?.total_count ?? 0), nextCursor, syncedAt: completedAt, stale: !completedAt || Date.now() - new Date(completedAt).getTime() >= STALE_DATA_MS };
}

export async function getStoredAnimalById(id: string) {
  await ensureTables();
  // 상세페이지는 목록에 필요한 컬럼만 읽습니다. 이미지 검증은 동기화 시점에
  // 끝내고, 사용자가 상세페이지를 열 때 원본 이미지를 다시 다운로드하지 않습니다.
  const { data, error } = await getSupabaseServerClient().from("visible_public_animals").select(LIST_ANIMAL_COLUMNS).eq("id", id).limit(1);
  if (error || !data?.[0]) {
    return undefined;
  }
  const animal = fromStored(storedAnimal(data[0] as Record<string, unknown>));
  const images = Array.from(new Set(animal.images || [animal.image].filter(Boolean)));
  const result = { ...animal, image: images[0] || animal.image, images, photoCount: images.length };
  return result;
}

export async function getStoredAnimalsByIds(ids: string[]): Promise<Animal[]> {
  if (!ids.length) return [];
  const { data, error } = await getSupabaseServerClient().from("visible_public_animals").select(LIST_ANIMAL_COLUMNS).in("id", ids);
  if (error) throw error;
  return (data || []).map(row => fromStored(storedAnimal(row as Record<string, unknown>)));
}

export async function getAnimalsByShelterId(shelterId: string, limit = 200) {
  try {
    await ensurePublicAnimals();
    const supabase = getSupabaseServerClient(), safeLimit = Math.min(500, Math.max(1, limit));
    const [{ data, error }, { count: total, error: countError }] = await Promise.all([
      supabase.from("visible_public_animals").select(LIST_ANIMAL_COLUMNS).eq("active", true).eq("shelter_id", shelterId).order("updated", { ascending: false }).limit(safeLimit),
      supabase.from("visible_public_animals").select("id", { count: "exact", head: true }).eq("active", true).eq("shelter_id", shelterId),
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
