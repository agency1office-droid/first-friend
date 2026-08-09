import { animals as fallbackAnimals, type Animal } from "./data";

const ABANDONED_API = "https://apis.data.go.kr/1543061/abandonmentPublicService_v2/abandonmentPublic_v2";
const SHELTER_API = "https://apis.data.go.kr/1543061/animalShelterSrvc_v2/shelterInfo_v2";
const LOSS_API = "https://apis.data.go.kr/1543061/lossInfoService/lossInfo";
const CACHE_MS = 10 * 60 * 1000;

type ApiEnvelope<T> = { response?: { header?: { resultCode?: string; resultMsg?: string }; body?: { items?: { item?: T | T[] } } } };
type AbandonedItem = { desertionNo?: string; happenDt?: string; happenPlace?: string; kindFullNm?: string; upKindNm?: string; kindNm?: string; colorCd?: string; age?: string; weight?: string; noticeNo?: string; noticeSdt?: string; noticeEdt?: string; popfile1?: string; popfile2?: string; processState?: string; sexCd?: string; neuterYn?: string; specialMark?: string; careNm?: string; careTel?: string; careAddr?: string; orgNm?: string; updTm?: string };
type LossItem = { happenDt?: string; happenAddr?: string; happenPlace?: string; orgNm?: string; popfile?: string; kindCd?: string; colorCd?: string; sexCd?: string; age?: string; specialMark?: string };
type ShelterItem = { careRegNo?: string; careNm?: string; orgNm?: string; saveTrgtAnimal?: string; careAddr?: string; careTel?: string; weekOprStime?: string; weekOprEtime?: string; closeDay?: string };

export type LostAnimal = { id: string; species: string; breed: string; sex: string; age: string; color: string; happenedAt: string; region: string; place: string; description: string; image: string };
export type Shelter = { id: string; name: string; organization: string; animals: string; address: string; phone: string; hours: string; closed: string };

let animalCache: { at: number; data: Animal[] } | undefined;
let lossCache: { at: number; data: LostAnimal[] } | undefined;
let shelterCache: { at: number; data: Shelter[] } | undefined;
const animalContacts = new Map<string, { shelter: string; phone: string; address: string; organization: string }>();

function key() { return process.env.PUBLIC_DATA_API_KEY?.trim(); }
function list<T>(value: T | T[] | undefined): T[] { return !value ? [] : Array.isArray(value) ? value : [value]; }

async function request<T>(endpoint: string, rows: number): Promise<T[]> {
  const serviceKey = key();
  if (!serviceKey) return [];
  const url = new URL(endpoint);
  url.searchParams.set("serviceKey", serviceKey);
  url.searchParams.set("pageNo", "1");
  url.searchParams.set("numOfRows", String(rows));
  url.searchParams.set("_type", "json");
  const response = await fetch(url, { cache: "no-store", signal: AbortSignal.timeout(7000) });
  if (!response.ok) throw new Error(`Public data API returned ${response.status}`);
  const payload = await response.json() as ApiEnvelope<T>;
  if (payload.response?.header?.resultCode !== "00") throw new Error(payload.response?.header?.resultMsg || "Public data API error");
  return list(payload.response.body?.items?.item);
}

function secureImage(url = "") { return url.replace(/^http:\/\//, "https://"); }
function compactDate(value = "") { const digits = value.replace(/\D/g, "").slice(0, 8); return digits.length === 8 ? `${digits.slice(0, 4)}. ${Number(digits.slice(4, 6))}. ${Number(digits.slice(6, 8))}.` : value; }
function sex(value = "") { return value === "M" ? "수컷" : value === "F" ? "암컷" : "미상"; }
function species(item: AbandonedItem) { return item.upKindNm || item.kindFullNm?.match(/^\[([^\]]+)/)?.[1] || "기타"; }
function ageGroup(value = ""): Animal["ageGroup"] { if (value.includes("60일미만")) return "어린 친구"; const born = Number(value.match(/(19|20)\d{2}/)?.[0]); return born && new Date().getFullYear() - born <= 1 ? "어린 친구" : "어른 친구"; }
function displayName(item: AbandonedItem) { return [item.kindNm || species(item), item.noticeNo?.split("-").at(-1)].filter(Boolean).join(" · "); }

function mapAnimal(item: AbandonedItem): Animal | null {
  if (!item.desertionNo || !item.popfile1) return null;
  const images = Array.from(new Set([item.popfile1, item.popfile2].map(secureImage).filter(Boolean)));
  animalContacts.set(item.desertionNo, { shelter: item.careNm || "관할 보호센터", phone: item.careTel || "", address: item.careAddr?.split(" ").slice(0, 2).join(" ") || "", organization: item.orgNm || "" });
  const animalSpecies = species(item);
  const state = item.processState || "공고중";
  const notice = item.noticeSdt && item.noticeEdt ? `공고 ${compactDate(item.noticeSdt)} ~ ${compactDate(item.noticeEdt)}` : "공고 기간은 상세 상담에서 확인해 주세요";
  return {
    id: item.desertionNo, name: displayName(item), species: animalSpecies, breed: item.kindNm || "품종 미상", age: item.age || "나이 미상", ageGroup: ageGroup(item.age), sex: sex(item.sexCd),
    region: item.orgNm || "지역 확인 중", shelter: item.careNm || "관할 보호센터", source: "국가동물보호정보시스템", updated: compactDate(item.updTm || item.happenDt),
    image: images[0], images, colors: item.colorCd?.split(/[,&+·]/).map((value) => value.trim()).filter(Boolean) || [],
    traits: [item.colorCd, item.weight, state].filter((value): value is string => Boolean(value)).slice(0, 3),
    summary: item.specialMark?.trim() || `${item.happenPlace || item.orgNm || "관할 지역"}에서 구조되어 보호 중인 ${animalSpecies}입니다.`,
    health: [item.weight ? `공개 체중 ${item.weight}` : "체중 정보 없음", item.neuterYn === "Y" ? "중성화 완료로 등록됨" : item.neuterYn === "N" ? "중성화되지 않은 것으로 등록됨" : "중성화 여부 미상", `현재 상태: ${state}`],
    life: [notice, `발견 장소: ${item.happenPlace || "상세 정보 없음"}`, "성격과 건강 상태는 보호센터 상담을 통해 확인해 주세요"],
    matchReason: `${item.colorCd || "등록된 털색"}과 ${item.kindNm || animalSpecies} 외형을 중심으로 비교했어요.`,
  };
}

export async function getAnimals(limit = 24): Promise<Animal[]> {
  if (!key()) return fallbackAnimals.slice(0, limit);
  if (animalCache && Date.now() - animalCache.at < CACHE_MS) return animalCache.data.slice(0, limit);
  try { const data = (await request<AbandonedItem>(ABANDONED_API, Math.max(limit, 100))).map(mapAnimal).filter((item): item is Animal => Boolean(item)); if (data.length) animalCache = { at: Date.now(), data }; return (data.length ? data : fallbackAnimals).slice(0, limit); }
  catch { return fallbackAnimals.slice(0, limit); }
}

export async function getAnimalById(id: string) { const items = await getAnimals(100); return items.find((item) => item.id === id) || fallbackAnimals.find((item) => item.id === id); }

export async function getAnimalContactById(id: string) {
  if (!key()) return null;
  if (animalContacts.has(id)) return animalContacts.get(id) || null;
  try { (await request<AbandonedItem>(ABANDONED_API, 100)).forEach(mapAnimal); return animalContacts.get(id) || null; } catch { return null; }
}

export async function getLostAnimals(limit = 12): Promise<LostAnimal[]> {
  if (!key()) return [];
  if (lossCache && Date.now() - lossCache.at < CACHE_MS) return lossCache.data.slice(0, limit);
  try {
    const data = (await request<LossItem>(LOSS_API, Math.max(limit, 30))).map((item, index) => ({
      id: `${item.happenDt || "loss"}-${index}`, species: item.kindCd?.includes("고양이") ? "고양이" : item.kindCd?.includes("견") ? "강아지" : "기타", breed: item.kindCd || "품종 미상", sex: sex(item.sexCd), age: item.age || "나이 미상", color: item.colorCd || "털색 미상", happenedAt: item.happenDt?.replace(/\.0$/, "") || "발생일 미상", region: item.orgNm || "지역 미상", place: item.happenPlace || item.happenAddr || "상세 장소 없음", description: item.specialMark || "등록된 특징이 없습니다.", image: secureImage(item.popfile),
    })).filter((item) => item.image);
    lossCache = { at: Date.now(), data }; return data.slice(0, limit);
  } catch { return []; }
}

export async function getShelters(limit = 20): Promise<Shelter[]> {
  if (!key()) return [];
  if (shelterCache && Date.now() - shelterCache.at < CACHE_MS) return shelterCache.data.slice(0, limit);
  try {
    const data = (await request<ShelterItem>(SHELTER_API, Math.max(limit, 50))).map((item, index) => ({
      id: item.careRegNo || `shelter-${index}`, name: item.careNm || "동물보호센터", organization: item.orgNm || "관할 기관", animals: item.saveTrgtAnimal?.replaceAll("+", " · ") || "보호 동물 문의", address: item.careAddr || "주소 정보 없음", phone: item.careTel || "전화번호 정보 없음", hours: item.weekOprStime && item.weekOprEtime ? `${item.weekOprStime} ~ ${item.weekOprEtime}` : "운영시간 문의", closed: item.closeDay && item.closeDay !== "0" ? item.closeDay : "휴무일 문의",
    }));
    shelterCache = { at: Date.now(), data }; return data.slice(0, limit);
  } catch { return []; }
}
