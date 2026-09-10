// 지도 API 라벨과 공공 데이터 주소를 같은 기준으로 비교하기 위한 순수 함수 모음입니다.
// Supabase나 Next 런타임에 의존하지 않아 서버와 클라이언트가 함께 사용합니다.

const PROVINCE_SUFFIX = /(특별자치도|특별자치시|특별시|광역시|자치시|도|시)$/;
const PROVINCE_TOKEN = /(특별자치도|특별자치시|특별시|광역시|자치시|도)$/;
const DISTRICT_SUFFIX = /[시군구]$/;
const TOWN_SUFFIX = /[읍면동리]$/;

// 같은 시도를 공공 데이터와 지도 API가 다르게 적는 경우가 있어 두 표기를 함께 넘깁니다.
const PROVINCE_GROUPS = [
  ["전북", "전라북"], ["전남", "전라남"], ["충북", "충청북"],
  ["충남", "충청남"], ["경북", "경상북"], ["경남", "경상남"],
];

export type LostRegionQuery = { provinces: string[]; prefix: string; dong: string | null };

export function provinceVariants(root: string) {
  return PROVINCE_GROUPS.find(group => group.includes(root)) || [root];
}

function tokens(value: string) {
  return value.replaceAll(",", " ").split(/\s+/).filter(Boolean);
}

function lastIndexOf(parts: string[], pattern: RegExp) {
  return parts.reduce((found, part, index) => (pattern.test(part) ? index : found), -1);
}

// 사용자가 아는 가장 좁은 시·군·구를 노출 상한으로 삼습니다.
// 상한을 정할 수 없으면 null을 돌려 실종 카드를 노출하지 않습니다.
export function lostRegionQuery(label: string): LostRegionQuery | null {
  const parts = tokens(label || "");
  const root = (parts[0] || "").replace(PROVINCE_SUFFIX, "");
  const rest = parts.slice(1);
  if (!root || !rest.length) return null;
  const districtIndex = lastIndexOf(rest, DISTRICT_SUFFIX);
  const townIndex = lastIndexOf(rest, TOWN_SUFFIX);
  // 세종처럼 기초자치단체가 없는 지역은 읍·면을 상한으로 씁니다.
  const baseIndex = districtIndex >= 0 ? districtIndex : townIndex;
  if (baseIndex < 0) return null;
  return {
    provinces: provinceVariants(root),
    prefix: rest.slice(0, baseIndex + 1).join(" "),
    dong: townIndex > baseIndex ? rest.slice(0, townIndex + 1).join(" ") : null,
  };
}

// 공공 API의 happenDt를 date 컬럼에 넣을 수 있는 문자열로 바꿉니다.
export function lostHappenedOn(raw = ""): string | null {
  const match = raw.trim().match(/^(\d{4})[-.]?(\d{1,2})[-.]?(\d{1,2})/);
  if (!match) return null;
  const month = Number(match[2]), day = Number(match[3]);
  if (month < 1 || month > 12 || day < 1 || day > 31) return null;
  return `${match[1]}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

// 카드에는 관할 기관명 대신 실제 발생 주소의 시·군·구와 동을 보여줍니다.
export function lostDisplayRegion(address = "", region = "") {
  const source = address.trim() || region.trim();
  const parts = tokens(source);
  const body = PROVINCE_TOKEN.test(parts[0] || "") ? parts.slice(1) : parts;
  const admin = body.filter(part => DISTRICT_SUFFIX.test(part) || TOWN_SUFFIX.test(part));
  return (admin.length ? admin.slice(-2) : body.slice(-2)).join(" ") || source;
}

// 제보가 의미를 갖는 기간입니다. RPC의 상한과 같은 값을 유지해야 합니다.
export const LOST_FRESHNESS_DAYS = 90;

export function lostFreshnessCutoff(now = new Date()) {
  const cutoff = new Date(now);
  cutoff.setUTCDate(cutoff.getUTCDate() - LOST_FRESHNESS_DAYS);
  return cutoff.toISOString().slice(0, 10);
}
