const BREED_ENDPOINT = "https://apis.data.go.kr/1543061/abandonmentPublicService_v2/kind_v2";
const CACHE_MS = 24 * 60 * 60 * 1000;

type BreedItem = { kindCd?: string; kindNm?: string };
type Envelope = { response?: { header?: { resultCode?: string; resultMsg?: string }; body?: { items?: { item?: BreedItem | BreedItem[] } } } };

export type PublicBreed = {
  key: string;
  upKindCd: "417000" | "422400";
  kindCd: string;
  kindNm: string;
  species: "dog" | "cat";
};

let cache: { expiresAt: number; items: PublicBreed[] } | null = null;
let running: Promise<PublicBreed[]> | null = null;

function apiKey() { return process.env.PUBLIC_DATA_API_KEY?.trim(); }

async function fetchKind(upKindCd: PublicBreed["upKindCd"], species: PublicBreed["species"]) {
  const key = apiKey();
  if (!key) throw new Error("PUBLIC_DATA_API_KEY가 설정되지 않았습니다.");
  const url = new URL(BREED_ENDPOINT);
  url.searchParams.set("serviceKey", key);
  url.searchParams.set("up_kind_cd", upKindCd);
  url.searchParams.set("pageNo", "1");
  url.searchParams.set("numOfRows", "1000");
  url.searchParams.set("_type", "json");
  const response = await fetch(url, { cache: "no-store", signal: AbortSignal.timeout(15000) });
  if (!response.ok) throw new Error(`공공데이터 품종 API 응답 오류 ${response.status}`);
  const payload = await response.json() as Envelope;
  if (payload.response?.header?.resultCode !== "00") throw new Error(payload.response?.header?.resultMsg || "공공데이터 품종 API 오류");
  const raw = payload.response.body?.items?.item;
  const rows = raw ? (Array.isArray(raw) ? raw : [raw]) : [];
  return rows.filter((item): item is Required<BreedItem> => Boolean(item.kindCd && item.kindNm)).map(item => ({
    key: `${upKindCd}:${item.kindCd}`,
    upKindCd,
    kindCd: item.kindCd,
    kindNm: item.kindNm,
    species,
  }));
}

async function load() {
  if (cache && cache.expiresAt > Date.now()) return cache.items;
  if (!running) running = Promise.all([fetchKind("417000", "dog"), fetchKind("422400", "cat")]).then(groups => {
    const items = groups.flat().sort((a, b) => a.kindNm.localeCompare(b.kindNm, "ko-KR"));
    cache = { items, expiresAt: Date.now() + CACHE_MS };
    return items;
  }).finally(() => { running = null; });
  return running;
}

export async function getPublicBreeds(species: "all" | "dog" | "cat" = "all") {
  const items = await load();
  return species === "all" ? items : items.filter(item => item.species === species);
}
