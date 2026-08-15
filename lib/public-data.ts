import { animals as fallbackAnimals, type Animal } from "./data";
import { getSupabaseServerClient } from "./supabase/server";

const ABANDONED_API = "https://apis.data.go.kr/1543061/abandonmentPublicService_v2/abandonmentPublic_v2";
const SHELTER_API = "https://apis.data.go.kr/1543061/animalShelterSrvc_v2/shelterInfo_v2";
const LOSS_API = "https://apis.data.go.kr/1543061/lossInfoService/lossInfo";
const CACHE_MS = 10 * 60 * 1000;

type ApiEnvelope<T> = { response?: { header?: { resultCode?: string; resultMsg?: string }; body?: { items?: { item?: T | T[] }; totalCount?: number | string } } };
type AbandonedItem = { desertionNo?: string; happenDt?: string; happenPlace?: string; kindFullNm?: string; upKindNm?: string; kindNm?: string; colorCd?: string; age?: string; weight?: string; noticeNo?: string; noticeSdt?: string; noticeEdt?: string; popfile1?: string; popfile2?: string; processState?: string; sexCd?: string; neuterYn?: string; specialMark?: string; careRegNo?: string; careNm?: string; careTel?: string; careAddr?: string; orgNm?: string; updTm?: string };
type LossItem = { happenDt?: string; happenAddr?: string; happenPlace?: string; orgNm?: string; popfile?: string; kindCd?: string; colorCd?: string; sexCd?: string; age?: string; specialMark?: string; rfidCd?: string };
type ShelterItem = { careRegNo?: string; careNm?: string; orgNm?: string; saveTrgtAnimal?: string; careAddr?: string; careTel?: string; weekOprStime?: string; weekOprEtime?: string; closeDay?: string; lat?: string; lng?: string };

export type LostAnimal = { id: string; legacyId?: string; species: string; breed: string; sex: string; age: string; color: string; happenedAt: string; region: string; address: string; place: string; description: string; image: string };
export type Shelter = { id: string; name: string; organization: string; animals: string; address: string; phone: string; hours: string; closed: string; lat: number; lng: number; approximateLocation: boolean };

let animalCache: { at: number; data: Animal[] } | undefined;
const animalDetailCache = new Map<string, { at: number; data: Animal | null }>();
let lossCache: { at: number; data: LostAnimal[] } | undefined;
let shelterCache: { at: number; data: Shelter[] } | undefined;
const animalContacts = new Map<string, { shelter: string; phone: string; address: string; organization: string }>();

function key() { return process.env.PUBLIC_DATA_API_KEY?.trim(); }
function list<T>(value: T | T[] | undefined): T[] { return !value ? [] : Array.isArray(value) ? value : [value]; }

async function request<T>(endpoint: string, rows: number, pageNo = 1): Promise<T[]> {
  const serviceKey = key();
  if (!serviceKey) return [];
  const url = new URL(endpoint);
  url.searchParams.set("serviceKey", serviceKey);
  url.searchParams.set("pageNo", String(pageNo));
  url.searchParams.set("numOfRows", String(rows));
  url.searchParams.set("_type", "json");
  const response = await fetch(url, { cache: "no-store", signal: AbortSignal.timeout(7000) });
  if (!response.ok) throw new Error(`Public data API returned ${response.status}`);
  const payload = await response.json() as ApiEnvelope<T>;
  if (payload.response?.header?.resultCode !== "00") throw new Error(payload.response?.header?.resultMsg || "Public data API error");
  return list(payload.response.body?.items?.item);
}

async function requestLossPage(pageNo: number, rows: number) {
  const serviceKey = key();
  if (!serviceKey) return { items: [] as LossItem[], total: 0 };
  const url = new URL(LOSS_API);
  url.searchParams.set("serviceKey", serviceKey);
  url.searchParams.set("pageNo", String(pageNo));
  url.searchParams.set("numOfRows", String(rows));
  url.searchParams.set("_type", "json");
  const response = await fetch(url, { cache: "no-store", signal: AbortSignal.timeout(7000) });
  if (!response.ok) throw new Error(`Public loss data API returned ${response.status}`);
  const payload = await response.json() as ApiEnvelope<LossItem>;
  if (payload.response?.header?.resultCode !== "00") throw new Error(payload.response?.header?.resultMsg || "Public loss data API error");
  return { items: list(payload.response.body?.items?.item), total: Number(payload.response.body?.totalCount || 0) };
}

function secureImage(url = "") { return url.replace(/^http:\/\//, "https://"); }
function compactDate(value = "") { const digits = value.replace(/\D/g, "").slice(0, 8); return digits.length === 8 ? `${digits.slice(0, 4)}. ${Number(digits.slice(4, 6))}. ${Number(digits.slice(6, 8))}.` : value; }
function sex(value = "") { return value === "M" ? "수컷" : value === "F" ? "암컷" : "미상"; }
function lostSpecies(kind = "") {
  const value = kind.trim().toLocaleLowerCase("ko-KR");
  if (/고양이|묘|러시안\s*블루|레그돌|랙돌|페르시안|샴|스코티시|메인쿤|브리티시|먼치킨|노르웨이숲|아메리칸숏헤어|벵갈|터키시|아비시니안|스핑크스|라가머핀|버만|데본렉스|셀커크|엑조틱/.test(value)) return "고양이";
  if (/견|강아지|^개$|말티즈|푸들|포메라니안|비숑|치와와|시츄|코카|진돗개|셰퍼드|리트리버|스피츠|테리어|불독|닥스훈트|파피용|보더콜리|사모예드|허스키|비글|웰시코기|도베르만|로트와일러|핀셔|마스티프/.test(value)) return "강아지";
  return "기타";
}
const regionCenters: Record<string, [number, number]> = {
  서울: [37.5665, 126.978], 부산: [35.1796, 129.0756], 대구: [35.8714, 128.6014], 인천: [37.4563, 126.7052], 광주: [35.1595, 126.8526], 대전: [36.3504, 127.3845], 울산: [35.5384, 129.3114], 세종: [36.4801, 127.289], 경기: [37.275, 127.009], 강원: [37.8854, 127.7298], 충북: [36.6357, 127.4917], 충남: [36.6588, 126.6728], 전북: [35.8202, 127.1089], 전남: [34.8161, 126.4629], 경북: [36.5759, 128.5056], 경남: [35.2383, 128.6924], 제주: [33.4996, 126.5312],
};
function shelterPoint(item: ShelterItem) {
  const lat = Number(item.lat), lng = Number(item.lng);
  if (Number.isFinite(lat) && Number.isFinite(lng) && lat > 30 && lat < 40 && lng > 120 && lng < 135) return { lat, lng, approximateLocation: false };
  const region = Object.keys(regionCenters).find(name => `${item.orgNm || ""} ${item.careAddr || ""}`.includes(name)) || "서울";
  const [fallbackLat, fallbackLng] = regionCenters[region];
  return { lat: fallbackLat, lng: fallbackLng, approximateLocation: true };
}
function species(item: AbandonedItem) { return item.upKindNm || item.kindFullNm?.match(/^\[([^\]]+)/)?.[1] || "기타"; }
function ageGroup(value = ""): Animal["ageGroup"] { if (value.includes("60일미만")) return "어린 친구"; const born = Number(value.match(/(19|20)\d{2}/)?.[0]); if (!born) return "나이 미상"; return new Date().getFullYear() - born <= 1 ? "어린 친구" : "어른 친구"; }
function displayName(item: AbandonedItem) { return [item.kindNm || species(item), item.noticeNo?.split("-").at(-1)].filter(Boolean).join(" · "); }

async function mergeDirectAnimals(base: Animal[], limit: number) {
  try {
    const client = getSupabaseServerClient();
    const [{ data: rows }, { data: media }] = await Promise.all([client.from("direct_animals").select("*").eq("status", "published"), client.from("animal_media").select("*").eq("media_type", "image").order("sort_order")]);
    const activeRows = (rows || []).filter(row => !row.reconfirmed_at || Date.now() - new Date(row.reconfirmed_at).getTime() <= 30 * 86400000);
    const direct = activeRows.map(row => { const health = JSON.parse(row.health_json || "{}") as Record<string, string>, life = JSON.parse(row.life_json || "{}") as Record<string, string>, images = (media || []).filter(item => item.animal_id === row.id).map(item => `/media/${item.object_key}`), traits = [life.personality, health.weight, health.neutered].filter(Boolean).slice(0, 3); return { id: `direct-${row.id}`, name: row.name, species: row.species, breed: "직접 등록 · 상담 확인", age: "상담 확인", ageGroup: "어른 친구" as const, sex: "상담 확인", region: row.region, shelter: "개인 임시보호", source: "개인 임시보호 등록", updated: compactDate(row.updated_at), image: images[0] || (row.image_key ? `/media/${row.image_key}` : ""), images, photoCount: images.length, colors: [], traits, summary: row.rescue_story.slice(0, 160), health: [health.vaccination, health.neutered && `중성화 ${health.neutered}`, health.treatment].filter(Boolean), life: [life.personality, life.aloneTime, life.toilet, life.compatibility].filter(Boolean), matchReason: "임시보호자가 등록한 외형·생활 정보를 조건과 비교했어요." } satisfies Animal; });
    return [...direct, ...base].slice(0, limit);
  } catch { return base.slice(0, limit); }
}

function mapAnimal(item: AbandonedItem, shelters: Shelter[] = []): Animal | null {
  if (!item.desertionNo || !item.popfile1) return null;
  // 입양 탐색에는 반환·입양·방사·자연사 등 이미 종료된 공고를 노출하지 않습니다.
  if ((item.processState || "").trim().startsWith("종료")) return null;
  const images = Array.from(new Set([item.popfile1, item.popfile2].map(secureImage).filter(Boolean)));
  animalContacts.set(item.desertionNo, { shelter: item.careNm || "관할 보호센터", phone: item.careTel || "", address: item.careAddr?.split(" ").slice(0, 2).join(" ") || "", organization: item.orgNm || "" });
  const animalSpecies = species(item);
  const shelter = shelters.find((candidate) => item.careRegNo && candidate.id === item.careRegNo)
    || shelters.find((candidate) => candidate.name === item.careNm)
    || shelters.find((candidate) => item.careAddr && candidate.address === item.careAddr);
  const state = item.processState || "공고중";
  const notice = item.noticeSdt && item.noticeEdt ? `공고 ${compactDate(item.noticeSdt)} ~ ${compactDate(item.noticeEdt)}` : "공고 기간은 상세 상담에서 확인해 주세요";
  return {
    id: item.desertionNo, name: displayName(item), species: animalSpecies, breed: item.kindNm || "품종 미상", age: item.age || "나이 미상", ageGroup: ageGroup(item.age), sex: sex(item.sexCd),
    region: item.orgNm || "지역 확인 중", shelter: item.careNm || "관할 보호센터", shelterId: shelter?.id || item.careRegNo, shelterAddress: shelter?.address || item.careAddr, shelterPhone: shelter?.phone || item.careTel, shelterLat: shelter?.lat, shelterLng: shelter?.lng, approximateShelterLocation: shelter?.approximateLocation, source: "국가동물보호정보시스템", updated: compactDate(item.updTm || item.happenDt),
    image: images[0], images, colors: item.colorCd?.split(/[,&+·]/).map((value) => value.trim()).filter(Boolean) || [],
    traits: [item.colorCd, item.weight, state].filter((value): value is string => Boolean(value)).slice(0, 3),
    summary: item.specialMark?.trim() || `${(item.orgNm || "관할 지역").split(" ").slice(0, 2).join(" ")}에서 구조되어 보호 중인 ${animalSpecies}입니다. 정확한 구조 위치는 공개하지 않아요.`,
    health: [item.weight ? `공개 체중 ${item.weight}` : "체중 정보 없음", item.neuterYn === "Y" ? "중성화 완료로 등록됨" : item.neuterYn === "N" ? "중성화되지 않은 것으로 등록됨" : "중성화 여부 미상", `현재 상태: ${state}`],
    life: [notice, `발견 지역: ${(item.orgNm || "관할 지역").split(" ").slice(0, 2).join(" ")} 인근 · 정확한 구조 위치 비공개`, "성격과 건강 상태는 보호센터 상담을 통해 확인해 주세요"],
    matchReason: `${item.colorCd || "등록된 털색"}과 ${item.kindNm || animalSpecies} 외형을 중심으로 비교했어요.`,
  };
}

export async function getAnimals(limit = 24): Promise<Animal[]> {
  const supported = (animal: Animal) => /고양이|개|강아지/.test(animal.species) && !/기타/.test(animal.species);
  if (!key()) return mergeDirectAnimals(fallbackAnimals.filter(supported),limit);
  if (animalCache && Date.now() - animalCache.at < CACHE_MS) return mergeDirectAnimals(animalCache.data.filter(supported),limit);
  try { const [items, shelters] = await Promise.all([request<AbandonedItem>(ABANDONED_API, Math.max(limit * 3, 100)), getShelters(1000)]); const data = items.map((item) => mapAnimal(item, shelters)).filter((item): item is Animal => Boolean(item)).filter(supported); if (data.length) animalCache = { at: Date.now(), data }; return mergeDirectAnimals(data.length ? data : fallbackAnimals.filter(supported),limit); }
  catch { return mergeDirectAnimals(fallbackAnimals.filter(supported),limit); }
}

export async function getAnimalsWithPhotoCounts(limit = 24): Promise<Animal[]> {
  const items = await getAnimals(limit);
  return items.map(animal => ({ ...animal, photoCount: new Set(animal.images || [animal.image].filter(Boolean)).size }));
}

export async function getAnimalById(id: string) {
  const stored = await import("./public-animal-store").then(module => module.getStoredAnimalById(id)).catch(() => undefined);
  if (stored) return stored;
  const cached = animalDetailCache.get(id);
  if (cached && Date.now() - cached.at < CACHE_MS) return cached.data || undefined;
  // 공공 API 전체 검색은 상세 요청에서 실행하지 않습니다. 동기화 작업이
  // public_animals를 채우고, 상세페이지는 그 결과만 빠르게 읽어야 합니다.
  const animal = fallbackAnimals.find((item) => item.id === id);
  animalDetailCache.set(id, { at: Date.now(), data: animal || null });
  if (!animal) return undefined;
  const images = Array.from(new Set(animal.images || [animal.image].filter(Boolean)));
  return { ...animal, image: images[0] || animal.image, images };
}

export async function getAnimalContactById(id: string) {
  if (!key()) return null;
  if (animalContacts.has(id)) return animalContacts.get(id) || null;
  try { const [items, shelters] = await Promise.all([request<AbandonedItem>(ABANDONED_API, 100), getShelters(1000)]); items.forEach((item) => mapAnimal(item, shelters)); return animalContacts.get(id) || null; } catch { return null; }
}

export async function getLostAnimals(limit = 12): Promise<LostAnimal[]> {
  if (!key()) return [];
  if (lossCache && Date.now() - lossCache.at < CACHE_MS) return lossCache.data.slice(0, limit);
  try {
    const pageSize = 100, firstPage = await requestLossPage(1, pageSize), rawItems = [...firstPage.items];
    for (let pageNo = 2; pageNo <= Math.ceil(firstPage.total / pageSize); pageNo += 1) {
      const page = await requestLossPage(pageNo, pageSize);
      rawItems.push(...page.items);
      if (page.items.length < pageSize) break;
    }
    const data = rawItems.map((item, index) => ({
      id: item.rfidCd?.trim() || `${item.happenDt || "loss"}-${index}`, legacyId: `${item.happenDt || "loss"}-${index}`, species: lostSpecies(item.kindCd), breed: item.kindCd || "품종 미상", sex: sex(item.sexCd), age: item.age || "나이 미상", color: item.colorCd || "털색 미상", happenedAt: item.happenDt?.replace(/\.0$/, "") || "발생일 미상", region: item.orgNm || "지역 미상", address: item.happenAddr || "", place: `${item.orgNm || item.happenAddr?.split(" ").slice(0, 2).join(" ") || "관할 지역"} 인근 · 상세 위치 비공개`, description: item.specialMark || "등록된 특징이 없습니다.", image: secureImage(item.popfile),
    })).filter((item) => item.image);
    lossCache = { at: Date.now(), data }; return data.slice(0, limit);
  } catch { return []; }
}

export async function getLostAnimalById(id: string) {
  const animals = await getLostAnimals(1000);
  const exact = animals.find(animal => animal.id === id || animal.legacyId === id);
  if (exact) return exact;
  // 기존 홈 링크가 배열 순번 ID를 사용하던 시기의 URL도 날짜로 복구합니다.
  const legacyDate = id.match(/^(.*)-\d+$/)?.[1];
  return legacyDate ? animals.find(animal => animal.happenedAt === legacyDate || animal.happenedAt.startsWith(legacyDate)) : undefined;
}

function normalizeRegion(value: string) {
  return value.replace(/특별자치도|특별자치시|특별시|광역시|자치시/g, "").replaceAll(",", " ").split(/\s+/).filter(Boolean);
}

export function prioritizeLostAnimals(animals: LostAnimal[], homeRegion = "") {
  const homeParts = normalizeRegion(homeRegion);
  const province = homeParts[0];
  const cityDistrict = homeParts.find(part => /[시군구]$/.test(part));
  const neighborhood = homeParts.find(part => /[읍면동리]$/.test(part));
  const score = (animal: LostAnimal) => {
    const text = normalizeRegion(`${animal.address} ${animal.region}`);
    // 실종 API에는 보호동물처럼 좌표가 제공되지 않으므로,
    // 주소 행정구역을 이용해 실제 거리에 가장 가까운 순서를 근사합니다.
    if (neighborhood && text.includes(neighborhood)) return 4;
    if (cityDistrict && text.includes(cityDistrict)) return 3;
    if (province && text.includes(province)) return 2;
    if (homeParts.length && text.some(part => homeParts.includes(part))) return 1;
    return 0;
  };
  const today = new Date().toISOString().slice(0, 10);
  const hash = (value: string) => { let result = 0; for (let index = 0; index < value.length; index += 1) result = (result * 31 + value.charCodeAt(index)) >>> 0; return result; };
  return animals.map((animal, index) => ({ animal, index, score: score(animal), order: hash(`${animal.id}:${today}:${homeRegion}`) })).sort((a, b) => b.score - a.score || a.order - b.order || a.index - b.index).map(item => item.animal);
}

export async function getShelters(limit = 20): Promise<Shelter[]> {
  if (!key()) return [];
  if (shelterCache && Date.now() - shelterCache.at < CACHE_MS) return shelterCache.data.slice(0, limit);
  try {
    const data = (await request<ShelterItem>(SHELTER_API, 1000)).map((item, index) => ({
      id: item.careRegNo || `shelter-${index}`, name: item.careNm || "동물보호센터", organization: item.orgNm || "관할 기관", animals: item.saveTrgtAnimal?.replaceAll("+", " · ") || "보호 동물 문의", address: item.careAddr || "주소 정보 없음", phone: item.careTel || "전화번호 정보 없음", hours: item.weekOprStime && item.weekOprEtime ? `${item.weekOprStime} ~ ${item.weekOprEtime}` : "운영시간 문의", closed: item.closeDay && item.closeDay !== "0" ? item.closeDay : "휴무일 문의",
      ...shelterPoint(item),
    }));
    shelterCache = { at: Date.now(), data }; return data.slice(0, limit);
  } catch { return []; }
}

export async function getShelterById(id: string) {
  try {
    const { data, error } = await getSupabaseServerClient()
      .from("public_shelters")
      .select("id,name,organization,address,phone,hours,closed,lat,lng,approximate_location")
      .eq("id", id)
      .maybeSingle();
    if (!error && data) {
      const point = shelterPoint({
        orgNm: String(data.organization || ""),
        careAddr: String(data.address || ""),
        lat: data.lat == null ? "" : String(data.lat),
        lng: data.lng == null ? "" : String(data.lng),
      });
      return {
        id: String(data.id),
        name: String(data.name || "동물보호센터"),
        organization: String(data.organization || "관할 기관"),
        animals: "보호 동물 문의",
        address: String(data.address || "주소 정보 없음"),
        phone: String(data.phone || "전화번호 정보 없음"),
        hours: String(data.hours || "운영시간 문의"),
        closed: String(data.closed || "휴무일 문의"),
        ...point,
        approximateLocation: Boolean(data.approximate_location ?? point.approximateLocation),
      } satisfies Shelter;
    }
  } catch {
    // 동기화 직후나 DB 연결 장애 때는 공공 API fallback으로 공개 페이지를 유지합니다.
  }
  return (await getShelters(1000)).find((shelter) => shelter.id === id);
}
