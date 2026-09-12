// 첫 친구 이상형 월드컵의 순수 로직 모음입니다. 후보 요청 조건, 부족분 채우기, 대진 진행, 결과 링크를 담당합니다.
// Supabase나 Next 런타임에 의존하지 않아 서버와 클라이언트가 함께 사용하고, 테스트도 이 파일만 불러옵니다.
import type { Animal } from "./data";

export type Answers = { species: "dog" | "cat"; scope: "nearby" | "nationwide"; size: string; age: string; color: string };
export type GeoPointLike = { lat: number; lng: number } | null | undefined;
export type Bracket = { size: number; round: Animal[]; index: number; winners: Animal[]; picks: Animal[] };

const AGE_KEYS: Record<string, string> = { "어린 친구": "young", "청년 친구": "adult", "어른 친구": "mature", "나이 많은 친구": "senior" };
const NOTICE_DATE = /(\d{4})\.\s*(\d{1,2})\.\s*(\d{1,2})\./g;

// 조건을 덜 중요한 것부터 하나씩 넓힙니다: 털색 → 나이대 → 크기 → 전국. 종은 끝까지 유지합니다.
export function poolQueries(answers: Answers, location: GeoPointLike) {
  const nearby = answers.scope === "nearby" && location ? location : null;
  const build = (step: { color: boolean; age: boolean; size: boolean; nearby: boolean }) => {
    const params = new URLSearchParams({ species: answers.species, limit: "50" });
    if (step.size && answers.size !== "all") params.set("size", answers.size);
    if (step.age && answers.age !== "all") params.set("age", answers.age);
    if (step.color && answers.color !== "all") params.set("color", answers.color);
    if (step.nearby && nearby) { params.set("lat", String(nearby.lat)); params.set("lng", String(nearby.lng)); params.set("sort", "distance"); }
    else params.set("sort", "recent");
    return params.toString();
  };
  const steps = [
    { color: true, age: true, size: true, nearby: true },
    { color: false, age: true, size: true, nearby: true },
    { color: false, age: false, size: true, nearby: true },
    { color: false, age: false, size: false, nearby: true },
    { color: false, age: false, size: false, nearby: false },
  ];
  return [...new Set(steps.map(build))];
}

// "공고 2026. 7. 1. ~ 2026. 7. 11." 문구에서 시작일과 마감일을 읽습니다. 날짜가 없으면 null입니다.
export function noticeDates(animal: Pick<Animal, "life">) {
  const notice = animal.life.find(item => item.startsWith("공고 "));
  const dates = notice ? [...notice.matchAll(NOTICE_DATE)].map(match => new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3])).getTime()) : [];
  return { start: dates[0] ?? null, end: dates.at(-1) ?? null };
}

// 보호소가 적은 특징 문구에서 부상·질병 표현을 찾습니다. 문구가 없거나 성격·외모만 적힌 친구는 통과합니다.
// 사진만으로 보이는 상태는 알 수 없으므로, 여기서 거르는 것은 문구에 적힌 경우뿐입니다.
const HEALTH_CONCERN = /사고|출혈|골절|부상|상처|교상|절뚝|절름|보행이상|다리\s*못|마비|기력|무기력|허약|탈진|쇠약|저체온|탈수|마름|설사|점액변|구토|기침|콧물|눈곱|결막염|안질환|실명|눈\s*못|허피스|범백|파보\s*양성|지알디아|호흡기|폐렴|감기|피부병|피부\s*질환|탈모|진드기|기생충|염증|부종|종양|의식\s*없|예후|나쁨|나쁜|안\s*좋|힘들|아픔|다침|다쳐|치료|수술|입원|처치|안락사/;
export function hasHealthConcern(animal: Pick<Animal, "summary">) {
  return HEALTH_CONCERN.test(animal.summary ?? "");
}

function byDeadline(a: Animal, b: Animal) {
  const first = noticeDates(a), second = noticeDates(b);
  return (first.end ?? Infinity) - (second.end ?? Infinity) || (first.start ?? Infinity) - (second.start ?? Infinity);
}

export function shuffle<T>(items: T[], random: () => number) {
  const result = [...items];
  for (let index = result.length - 1; index > 0; index -= 1) {
    const swap = Math.floor(random() * (index + 1));
    [result[index], result[swap]] = [result[swap], result[index]];
  }
  return result;
}

// 조건에 맞는 첫 페이지(최신순 최대 50마리)에서 무작위로 뽑아 다시 해도 같은 친구만 나오지 않게 합니다. random이 없으면 받은 순서를 지킵니다.
// 부족분만 넓힌 조건에서 공고 마감이 가까운 순, 같으면 더 오래 기다린 순으로 채웁니다.
export function pickPool(pages: Animal[][], size: number, random?: () => number) {
  const seen = new Set<string>();
  const usable = (items: Animal[]) => items.filter(item => { if (!item.image.trim() || hasHealthConcern(item) || seen.has(item.id)) return false; seen.add(item.id); return true; });
  const candidates = usable(pages[0] ?? []);
  const matched = (random ? shuffle(candidates, random) : candidates).slice(0, size);
  const fallback = pages.slice(1).flatMap(usable).sort(byDeadline);
  const pool = [...matched, ...fallback.slice(0, size - matched.length)];
  return { pool: pool.length < 2 ? [] : pool, matched: matched.length, filled: pool.length - matched.length };
}

export function startBracket(pool: Animal[], random: () => number): Bracket {
  const round = shuffle(pool, random);
  return { size: round.length, round, index: 0, winners: [], picks: [] };
}

export function currentPair(bracket: Bracket): [Animal, Animal] | null {
  const pair = bracket.round.slice(bracket.index, bracket.index + 2);
  return pair.length === 2 ? [pair[0], pair[1]] : null;
}

// 고른 친구만 다음 라운드로 올라갑니다. 짝이 없는 마지막 친구는 부전승입니다.
export function choose(bracket: Bracket, winner: Animal): Bracket {
  const winners = [...bracket.winners, winner];
  const picks = [...bracket.picks, winner];
  let index = bracket.index + 2;
  if (index === bracket.round.length - 1) { winners.push(bracket.round[index]); index += 1; }
  if (index >= bracket.round.length) return { ...bracket, round: winners, index: 0, winners: [], picks };
  return { ...bracket, winners, index, picks };
}

export function isDone(bracket: Bracket) { return bracket.round.length === 1; }
export function winnerOf(bracket: Bracket) { return isDone(bracket) ? bracket.round[0] : null; }
export function roundLabel(count: number) { return count === 2 ? "결승" : `${count}강`; }
// 한 번 고를 때마다 한 친구가 탈락하므로 전체 선택 수는 항상 후보 수 - 1입니다.
export function progress(bracket: Bracket) { return bracket.size > 1 ? bracket.picks.length / (bracket.size - 1) : 1; }

function mostCommon(values: string[]) {
  const counts = new Map<string, number>();
  for (const value of values) if (value) counts.set(value, (counts.get(value) ?? 0) + 1);
  return [...counts.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] ?? "";
}

// 답한 조건은 그대로 두고, 상관없음으로 둔 나이대·털색만 고른 친구들에서 가장 잦은 값으로 채웁니다.
export function buildFindHref(answers: Answers, picks: Animal[]) {
  const params = new URLSearchParams({ species: answers.species });
  if (answers.size !== "all") params.set("size", answers.size);
  const age = answers.age !== "all" ? answers.age : AGE_KEYS[mostCommon(picks.map(pick => pick.ageGroup))] ?? "";
  if (age) params.set("age", age);
  const color = answers.color !== "all" ? answers.color : mostCommon(picks.map(pick => pick.colors[0] ?? ""));
  if (color) params.set("color", color);
  if (answers.scope === "nationwide") params.set("sort", "recent");
  return `/find?${params}`;
}
