// 공공 API의 대표 품종명은 유지하고, 사용자가 실제로 입력할 수 있는
// 통칭·띄어쓰기 변형만 검색어로 확장합니다. 선택되는 값은 항상 kindCd입니다.
const BREED_ALIASES: Record<string, string[]> = {
  "진돗개": ["진도개", "진도견", "진돗견"],
  "믹스견": ["혼종견", "잡종견", "믹스", "믹스개"],
  "한국 고양이": ["코리안숏헤어", "코숏", "한국고양이", "코리안 쇼트헤어"],
  "말티즈": ["말티", "말티스"],
  "푸들": ["토이푸들", "미니어처푸들", "미니푸들", "스탠더드푸들"],
  "포메라니안": ["포메"],
  "시츄": ["시추"],
  "요크셔테리어": ["요키", "요크셔"],
  "닥스훈트": ["닥스"],
  "코커스파니엘": ["코카스파니엘", "코카"],
};

function compact(value: string) {
  return value.trim().toLocaleLowerCase("ko-KR").replace(/[\s·・._-]+/g, "");
}

/** 검색어가 공공 API 대표 품종명 또는 등록된 별칭과 일치하는지 확인합니다. */
export function matchesPublicBreedSearch(kindNm: string, query: string) {
  const word = compact(query);
  if (!word) return true;
  const name = compact(kindNm);
  const aliases = Object.entries(BREED_ALIASES).find(([canonical]) => compact(canonical) === name)?.[1] || [];
  return [kindNm, ...aliases].some(value => compact(value).includes(word));
}

/** 검색 접근성을 위해 대표명과 별칭을 함께 제공합니다. 화면 표시는 대표명만 사용합니다. */
export function publicBreedSearchTerms(kindNm: string) {
  const name = compact(kindNm);
  const aliases = Object.entries(BREED_ALIASES).find(([canonical]) => compact(canonical) === name)?.[1] || [];
  return [kindNm, ...aliases];
}
