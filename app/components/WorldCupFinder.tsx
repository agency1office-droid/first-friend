"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import { ActionButton } from "seed-design/ui/action-button";
import { Chip } from "seed-design/ui/chip";
import { IconArrowDownLine, IconArrowUpBracketDownLine, IconChevronRightLine, IconPicture2StackedLine, IconXmarkLine } from "@karrotmarket/react-monochrome-icon";
import type { Animal } from "../../lib/data";
import type { AnimalPage } from "../../lib/public-animal-store";
import { optimizedAnimalImageUrl } from "../../lib/image-url";
import { choose, currentPair, expandColorQueries, isDone, pickPool, poolQueries, progress, roundLabel, startBracket, winnerOf, type Answers, type Bracket } from "../../lib/worldcup";
import { AnimalThumbnail } from "./AnimalThumbnail";
import { exportCardPng, loadCardAssets, WorldCupCard, type CardAssets } from "./WorldCupCard";
import { navigateAppBack } from "./AppChrome";
import { useAppFeedback } from "./AppFeedback";
import { closeToDetail } from "./detailReturn";
import { FavoriteButton } from "./FavoriteButton";
import { LoadingIndicator } from "./LoadingIndicator";
import { ReadinessAppBar } from "./ReadinessAppBar";

// 화면 구조·클래스는 입양 환경 점검(CareReadinessFlow)과 같습니다. 앱바 → 진행 바 → 인트로/단계/결과 → 하단 버튼.
type Species = "cat" | "dog";
type Step = "species" | "size" | "color" | "round";
type Phase = "intro" | "steps" | "match" | "result";
// 크기·털색은 여러 개 고를 수 있습니다. null은 아직 고르지 않음, ["all"]은 상관없음입니다.
type Draft = { species: Species | null; size: string[] | null; color: string[] | null };

const EMPTY_DRAFT: Draft = { species: null, size: null, color: null };
const STEPS: Step[] = ["species", "size", "color", "round"];
// 크기 기준은 품종 표(lib/public-animal-store.ts sizeGroup)와 같습니다. 믹스·품종 미상은 unknown이라 상관없음에서만 나옵니다.
const SIZE_OPTIONS = [["all", "상관없음"], ["small", "소형"], ["medium", "중형"], ["large,xlarge", "대형"]] as const;
const DOG_COLORS = ["흰색", "검정", "갈색", "황색", "회색", "기타·복합색"];
const CAT_COLORS = ["흰색", "검정", "갈색", "황색", "회색", "삼색", "고등어", "치즈", "기타·복합색"];

// 라운드 안내 문구의 남은 친구 수를 우리말로 읽습니다. (8강·4강만 안내하므로 둘이면 충분하지만 32강 흐름을 위해 16도 둡니다.)
const KOREAN_COUNT: Record<number, string> = { 16: "열여섯", 8: "여덟", 4: "네" };

// 예전에 저장된 결과(문자열 답)도 배열로 읽습니다.
function toList(values: string[] | string | null | undefined) {
  return Array.isArray(values) ? values : values ? [values] : null;
}
function normalizeDraft(draft: Draft): Draft {
  return { species: draft.species, size: toList(draft.size), color: toList(draft.color) };
}
// 상관없음은 단독 선택이고, 다른 값을 고르면 상관없음이 빠집니다. 마지막 값을 해제하면 비워 두어 다음 버튼이 잠깁니다.
function toggleValue(current: string[] | null, value: string) {
  if (value === "all") return ["all"];
  const rest = (toList(current) ?? []).filter(item => item !== "all");
  const next = rest.includes(value) ? rest.filter(item => item !== value) : [...rest, value];
  return next.length ? next : null;
}
function csv(values: string[] | null) {
  const list = toList(values) ?? [];
  return !list.length || list.includes("all") ? "all" : list.join(",");
}
// 지역은 전국, 나이대는 제한 없음으로 고정합니다. 나이대는 결과의 닮은 친구 링크에서 선택 결과로 추론합니다.
function toAnswers(draft: Draft): Answers {
  return { species: draft.species ?? "dog", scope: "nationwide", size: csv(draft.size), age: "all", color: csv(draft.color) };
}
function displayAge(age: string) {
  if (age.includes("60일미만")) return "60일 미만";
  return age.replace(/^(\d{4})(?:\([^)]*\))*\(년생\)$/, "$1년생");
}
function meta(animal: Animal) {
  return [displayAge(animal.age), animal.sex, animal.region.trim().split(/\s+/).slice(0, 2).join(" ")].filter(Boolean).join(" · ");
}
function photosOf(animal: Animal) {
  return [...new Set([animal.image, ...(animal.images ?? [])].map(value => value.trim()).filter(Boolean))];
}
function detailUrl(animal: Animal) {
  return `${window.location.origin}/friends/${animal.id}?via=worldcup`;
}
// 결과 화면 배경(CSS ::before)에 깔 우승 친구 사진. url() 안에 들어가므로 따옴표·역슬래시만 이스케이프합니다.
function backdropStyle(animal: Animal) {
  return { "--ff-worldcup-backdrop": `url("${(animal.thumbnail || animal.image).replace(/["\\]/g, encodeURIComponent)}")` } as React.CSSProperties;
}
// 카드에 크게 쓰는 이름: 공공 데이터 품종. "기타"·"품종 미상"처럼 이름이 못 되는 값은 종으로 대신합니다.
function cardBreed(animal: Animal) {
  const breed = animal.name.split(" · ")[0]?.trim() || animal.breed;
  return /^(기타|품종\s*미상|미상)$/.test(breed) ? (animal.species === "고양이" ? "고양이 친구" : "강아지 친구") : breed;
}
async function fetchPage(query: string) {
  const response = await fetch(`/api/animals?${query}`, { cache: "no-store" });
  const body = await response.json() as AnimalPage & { error?: string };
  if (!response.ok) throw new Error(body.error || "후보를 불러오지 못했어요.");
  return body;
}
// 결과 화면에 도달한 판을 같은 탭 안에 남겨 두고, 결과를 본 히스토리 항목에 같은 id를 표식으로 남깁니다.
// 상세·홈 등으로 나갔다가 뒤로(또는 앞으로) 그 항목에 돌아오면 결과를 복원하고, 홈 바로가기처럼 새 항목으로 들어오면 처음부터 시작합니다.
// 탭을 닫으면 사라집니다. (vinext는 history.state의 추가 키를 이동 후에도 보존합니다.)
const RESULT_KEY = "ff-worldcup-result-v1";
const RESULT_MARK = "ffWorldcupResult";
type SavedRun = { id: string; draft: Draft; page: AnimalPage | null; roundSize: number; pool: Animal[]; filled: number; bracket: Bracket };
function readSavedRun(): SavedRun | null {
  try {
    const saved = JSON.parse(window.sessionStorage.getItem(RESULT_KEY) || "null") as SavedRun | null;
    return saved && typeof saved.id === "string" && Array.isArray(saved.pool) && saved.bracket && isDone(saved.bracket) ? saved : null;
  } catch { return null; }
}
function writeSavedRun(run: SavedRun | null) {
  try {
    if (run) window.sessionStorage.setItem(RESULT_KEY, JSON.stringify(run));
    else window.sessionStorage.removeItem(RESULT_KEY);
  } catch { /* 저장소가 막혀 있어도 월드컵은 계속 진행됩니다. */ }
  try {
    window.history.replaceState({ ...(window.history.state ?? {}), [RESULT_MARK]: run?.id ?? null }, "");
  } catch { /* history.state를 막는 환경에서는 복원 없이 처음부터 시작합니다. */ }
}
function arrivedAtSavedRun(saved: SavedRun) {
  try { return (window.history.state ?? {})[RESULT_MARK] === saved.id; } catch { return false; }
}
// 상세에서 열었으면 그 상세로, 아니면 들어온 곳(홈 바로가기 등)으로 돌아갑니다. 기록이 없을 때만 홈으로 갑니다.
function exitFlow() {
  if (new URLSearchParams(window.location.search).get("return_to")) closeToDetail();
  else navigateAppBack("/");
}

// member: 로그인한 회원(카드에 이름을 씀). admin이면 인트로에서 결과 화면을 바로 미리 볼 수 있습니다.
export function WorldCupFinder({ member = null }: { member?: { name: string; admin: boolean } | null }) {
  const feedback = useAppFeedback();
  const [phase, setPhase] = useState<Phase>("intro");
  const [stepIndex, setStepIndex] = useState(0);
  const [draft, setDraft] = useState<Draft>(EMPTY_DRAFT);
  const [page, setPage] = useState<AnimalPage | null>(null);
  const [roundSize, setRoundSize] = useState(16);
  const [loading, setLoading] = useState(false);
  const [empty, setEmpty] = useState(false);
  const [pool, setPool] = useState<Animal[]>([]);
  const [filled, setFilled] = useState(0);
  const [bracket, setBracket] = useState<Bracket | null>(null);
  const [history, setHistory] = useState<Bracket[]>([]);
  const [viewer, setViewer] = useState<{ animal: Animal; index: number } | null>(null);
  const [picking, setPicking] = useState<string | null>(null);
  // 8강·4강·결승에 들어설 때 보여 주는 라운드 안내(강 수). 화면을 누르면 대결로 넘어갑니다.
  const [roundIntro, setRoundIntro] = useState<number | null>(null);
  const dialogRef = useRef<HTMLDialogElement>(null);
  // 인연 카드: 화면에 보이는 SVG(cardRef)를 그대로 PNG로 뽑아 공유합니다. 사진·QR 등은 data URL로 받아 두어야 이미지로 변환됩니다.
  const cardRef = useRef<SVGSVGElement>(null);
  const [cardAssets, setCardAssets] = useState<CardAssets | null>(null);
  const [sharing, setSharing] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const scroller = document.querySelector<HTMLElement>(".ff-quiz-shell .ff-readiness > section");
    if (scroller) scroller.scrollTop = 0;
    else window.scrollTo(0, 0);
  }, [phase, stepIndex, bracket]);

  // 뒤로 가기로 돌아온 경우 남겨 둔 결과를 그대로 보여 줍니다. 홈 피드 스냅샷과 같이 다음 틱에 적용해 서버 렌더와 어긋나지 않게 합니다.
  useEffect(() => {
    const saved = readSavedRun();
    if (!saved || !arrivedAtSavedRun(saved)) return;
    const timer = window.setTimeout(() => {
      setDraft(normalizeDraft(saved.draft)); setPage(saved.page); setRoundSize(saved.roundSize); setPool(saved.pool); setFilled(saved.filled); setBracket(saved.bracket); setHistory([]);
      setPhase("result");
    }, 0);
    return () => window.clearTimeout(timer);
  }, []);

  const steps = STEPS;
  const step = steps[stepIndex];
  const answers = toAnswers(draft);
  // 32강 노출과 부족 안내는 실제 후보 규칙(서버 썸네일 있음·중복 제외, 건강은 서버 health=ok로 거름)과 같은 수로 판단합니다.
  const usable = page ? pickPool([page.items], page.items.length).pool.length : 0;
  const shortBy = Math.max(0, roundSize - usable);
  const canContinue = step === "species" ? draft.species !== null : step === "size" ? draft.size !== null : step === "color" ? draft.color !== null : !empty;
  const stepProgress = Math.max((stepIndex / steps.length) * 100, 6.25);
  const isResult = phase === "result";

  // 크기·털색 단계에서 선택지마다 해당하는 친구 수를 보여 줍니다(믹스·품종 미상이 많아 크기를 고르면 후보가 크게 줄기 때문).
  // 후보를 찾을 때와 같은 조건(종·서버 썸네일 있음·건강 양호, 털색 단계에서는 고른 크기까지)으로 세어 실제 후보 수와 맞습니다.
  // 단계·종·크기를 묶은 키마다 한 번만 세고, 다음 단계의 수는 미리 받아 두어 넘어갈 때 선택지와 수가 함께 보이게 합니다.
  // 미리 받지 못했으면(크기를 고르자마자 다음을 누른 경우 등) 수가 올 때까지 가운데 로딩을 보여 주고 선택지를 감춥니다.
  const countKeyFor = (stepName: Step | undefined, size: string) => draft.species && (stepName === "size" || stepName === "color") ? `${stepName}:${draft.species}:${stepName === "color" ? size : ""}` : "";
  const countKey = phase === "steps" ? countKeyFor(step, answers.size) : "";
  const nextCountKey = phase === "steps" ? countKeyFor(steps[stepIndex + 1], answers.size) : "";
  const [counts, setCounts] = useState<Record<string, Record<string, number>>>({});
  const countRequests = useRef(new Set<string>());
  useEffect(() => {
    const load = async (key: string) => {
      const [stepName, species, size] = key.split(":");
      const entries = stepName === "size"
        ? SIZE_OPTIONS.map(([value]): [string, Record<string, string>] => [value, value === "all" ? {} : { size: value }])
        : ["all", ...(species === "cat" ? CAT_COLORS : DOG_COLORS)].map((label): [string, Record<string, string>] => { const extra: Record<string, string> = {}; if (size && size !== "all") extra.size = size; if (label !== "all") extra.color = label; return [label, extra]; });
      const rows = await Promise.all(entries.map(async ([option, extra]) => {
        try { return [option, (await fetchPage(new URLSearchParams({ species, limit: "1", thumbnail: "1", health: "ok", sort: "recent", ...extra }).toString())).total] as const; }
        catch { return null; }
      }));
      setCounts(current => ({ ...current, [key]: Object.fromEntries(rows.filter((row): row is readonly [string, number] => row !== null)) }));
    };
    const request = (key: string) => { if (key && !countRequests.current.has(key)) { countRequests.current.add(key); void load(key); } };
    request(countKey);
    // 다음 단계(털색)의 키는 크기를 고를 때마다 바뀌므로 잠시 기다렸다가 받습니다.
    const timer = window.setTimeout(() => request(nextCountKey), 300);
    return () => window.clearTimeout(timer);
  }, [countKey, nextCountKey]);
  const countsReady = !countKey || counts[countKey] !== undefined;
  const countOf = (option: string) => counts[countKey]?.[option];

  async function loadPool() {
    setLoading(true);
    try {
      // 한 페이지는 최대 50마리라 중복을 걷어내면 32강이 안 나올 수 있습니다.
      // 조건을 넓히기 전에 같은 조건의 다음 페이지를 최대 두 번 더 받아 후보를 채웁니다.
      const query = poolQueries(answers, null)[0];
      const perColor = expandColorQueries(query);
      let loaded: AnimalPage;
      if (perColor.length > 1) {
        // 털색을 여러 개 고르면 색마다 첫 페이지를 받아 합칩니다(같은 친구는 한 번만). 후보가 넉넉해 다음 페이지는 받지 않습니다.
        const pages = await Promise.all(perColor.map(fetchPage));
        const seen = new Set<string>();
        loaded = { ...pages[0], items: pages.flatMap(item => item.items).filter(animal => { if (seen.has(animal.id)) return false; seen.add(animal.id); return true; }), total: pages.reduce((sum, item) => sum + item.total, 0), nextCursor: null };
      } else {
        loaded = await fetchPage(query);
        for (let extra = 0; extra < 2 && loaded.nextCursor && pickPool([loaded.items], loaded.items.length).pool.length < 32; extra += 1) {
          const more = await fetchPage(`${query}&cursor=${encodeURIComponent(loaded.nextCursor)}`);
          loaded = { ...loaded, items: [...loaded.items, ...more.items], nextCursor: more.nextCursor };
        }
      }
      setPage(loaded);
      setRoundSize(16); setEmpty(false); setStepIndex(value => value + 1);
    } catch (error) {
      feedback.error(error instanceof Error ? error.message : "후보를 불러오지 못했어요.");
    } finally {
      setLoading(false);
    }
  }

  async function startMatch() {
    if (!page) return;
    setLoading(true);
    try {
      const queries = poolQueries(answers, null);
      const pages = [page.items];
      let picked = pickPool(pages, roundSize, Math.random);
      for (let index = 1; index < queries.length && picked.pool.length < roundSize; index += 1) {
        pages.push((await fetchPage(queries[index])).items);
        picked = pickPool(pages, roundSize, Math.random);
      }
      if (!picked.pool.length) { setEmpty(true); return; }
      // 후보는 모두 서버 압축 썸네일(webp)이 있는 친구입니다. 대결이 시작되기 전에 미리 받아 두어 첫 화면부터 바로 보이게 합니다.
      picked.pool.forEach(animal => { const image = new window.Image(); image.decoding = "async"; image.src = optimizedAnimalImageUrl(animal.thumbnail || animal.image); });
      // 8강 안내에 쓰는 빨간 실도 미리 받아 두어 첫 안내에서 늦게 뜨지 않게 합니다.
      const string = new window.Image(); string.src = "/worldcup-string.webp";
      setPool(picked.pool); setFilled(picked.filled); setHistory([]);
      setBracket(startBracket(picked.pool, Math.random));
      setPhase("match");
    } catch (error) {
      feedback.error(error instanceof Error ? error.message : "후보를 불러오지 못했어요.");
    } finally {
      setLoading(false);
    }
  }

  // 카드 아래 선택 버튼을 누르면 바로 고르고 다음 대결로 넘어갑니다. 되돌리기는 앱바 뒤로가기(previous)로 합니다.
  function pick(animal: Animal) {
    if (!bracket) return;
    const following = choose(bracket, animal);
    setHistory(value => [...value, bracket]); setBracket(following);
    if (isDone(following)) { setPhase("result"); writeSavedRun({ id: `${Date.now().toString(36)}-${following.picks.length}`, draft, page, roundSize, pool, filled, bracket: following }); return; }
    // 라운드가 줄어드는 순간(8강·4강·결승 시작)에만 강 수를 보여 줍니다.
    if (following.round.length < bracket.round.length && following.round.length <= 8) setRoundIntro(following.round.length);
  }

  // 선택 버튼은 잠깐 브랜드 주황으로 바뀐 뒤 넘어갑니다. 탭이 짧아도 눌렸다는 느낌이 보이게 하고, 그동안 두 번 누름은 무시합니다.
  function select(animal: Animal) {
    if (picking) return;
    setPicking(animal.id);
    window.setTimeout(() => { setPicking(null); pick(animal); }, 180);
  }

  function next() {
    if (phase === "intro") { setPhase("steps"); setStepIndex(0); return; }
    if (phase === "match") return;
    if (!canContinue) return;
    if (step === "color") { void loadPool(); return; }
    if (step === "round") { void startMatch(); return; }
    setStepIndex(value => value + 1);
  }

  function previous() {
    if (phase === "intro") return exitFlow();
    if (phase === "match") {
      setRoundIntro(null);
      const last = history.at(-1);
      if (last) { setHistory(value => value.slice(0, -1)); setBracket(last); return; }
      setPhase("steps"); setStepIndex(steps.length - 1); return;
    }
    if (phase === "result") { setPhase("steps"); setStepIndex(steps.length - 1); setBracket(null); return; }
    if (stepIndex === 0) return exitFlow();
    setStepIndex(value => value - 1);
  }

  // 사진을 누르면 원본 사진을 모두 보여 줍니다. 목록 사진은 잘려 있거나 얼굴이 두 번째 사진에만 있을 수 있어요.
  function openViewer(animal: Animal) {
    setViewer({ animal, index: 0 });
    dialogRef.current?.showModal();
  }
  function closeViewer() {
    dialogRef.current?.close();
  }

  // 관리자 전용: 인트로에서 결과 화면(인연 카드)을 바로 봅니다. 강아지 후보 16마리를 받아 대결을 자동으로 끝냅니다. 저장하지 않습니다.
  async function previewResult() {
    setLoading(true);
    try {
      const preview: Answers = { species: "dog", scope: "nationwide", size: "all", age: "all", color: "all" };
      const sample = await fetchPage(poolQueries(preview, null)[0]);
      const picked = pickPool([sample.items], 16, Math.random);
      if (picked.pool.length < 2) throw new Error("미리보기에 쓸 후보가 부족해요.");
      let run = startBracket(picked.pool, Math.random);
      while (!isDone(run)) { const pair = currentPair(run); if (!pair) break; run = choose(run, pair[0]); }
      setDraft({ species: "dog", size: ["all"], color: ["all"] }); setPage(sample); setRoundSize(picked.pool.length); setEmpty(false);
      setPool(picked.pool); setFilled(picked.filled); setHistory([]); setBracket(run); setPhase("result");
    } catch (error) {
      feedback.error(error instanceof Error ? error.message : "미리보기를 열지 못했어요.");
    } finally {
      setLoading(false);
    }
  }

  // 화면의 카드 SVG를 PNG 파일로 뽑습니다(자산이 준비된 뒤에만 버튼이 눌림).
  async function cardPng(winner: Animal) {
    const card = cardRef.current;
    if (!card || cardAssets?.id !== winner.id) throw new Error("카드가 아직 준비되지 않았어요");
    return new File([await exportCardPng(card)], `firstfriend-${winner.id}.png`, { type: "image/png" });
  }

  // 카드 저장: PNG를 기기에 내려받습니다.
  async function saveCard(winner: Animal) {
    setSaving(true);
    try {
      const file = await cardPng(winner);
      const link = document.createElement("a"); link.href = URL.createObjectURL(file); link.download = file.name; link.click();
      window.setTimeout(() => URL.revokeObjectURL(link.href), 1000);
      feedback.success("카드를 저장했어요");
    } catch {
      feedback.error("카드를 저장하지 못했어요");
    } finally {
      setSaving(false);
    }
  }

  // 공유하기: 카드 PNG를 기기 공유 시트로(인스타 스토리·카톡에 이미지로). 파일 공유가 안 되면 링크만 공유, 그것도 안 되면 링크 복사.
  async function share(winner: Animal) {
    const url = detailUrl(winner);
    const title = `퍼스트 프렌드 · ${winner.name}`, text = `이상형 월드컵에서 끝까지 남은 ${winner.name} 친구예요.`;
    setSharing(true);
    try {
      const file = await cardPng(winner);
      if (typeof navigator.canShare === "function" && navigator.canShare({ files: [file] })) { await navigator.share({ files: [file], title, text: `${text}\n${url}` }); return; }
      if (navigator.share) { await navigator.share({ title, text, url }); return; }
      await navigator.clipboard.writeText(url);
      feedback.success("공유 링크를 복사했어요");
    } catch (error) {
      if (error instanceof DOMException && error.name === "AbortError") return; // 공유 시트를 그냥 닫은 경우
      feedback.error("공유를 완료하지 못했어요");
    } finally {
      setSharing(false);
    }
  }

  const pair = phase === "match" && bracket ? currentPair(bracket) : null;
  const winner = isResult && bracket ? winnerOf(bracket) : null;
  // 결과에 도달하면 카드에 넣을 사진·붉은 실·워드마크·QR을 data URL로 받아 둡니다(같은 친구면 다시 받지 않음).
  useEffect(() => {
    if (!winner || cardAssets?.id === winner.id) return;
    let active = true;
    // QR에는 짧은 주소만 넣어 모듈 수를 줄입니다(폰 화면에서 찍을 때 한 칸이 커져 잘 읽힘).
    loadCardAssets(winner, `${window.location.origin}/friends/${winner.id}`).then(assets => { if (active) setCardAssets(assets); }).catch(() => { if (active) feedback.error("카드 이미지를 준비하지 못했어요"); });
    return () => { active = false; };
  }, [winner, cardAssets, feedback]);
  const cardReady = Boolean(winner && cardAssets?.id === winner.id);
  const careStep = phase === "intro" ? "intro" : isResult ? "result" : phase === "match" ? "match" : step;
  const progressPercent = isResult ? 100 : phase === "match" && bracket ? Math.max(progress(bracket) * 100, 6.25) : stepProgress;
  const viewerPhotos = viewer ? photosOf(viewer.animal) : [];

  return <div className={`ff-readiness ff-care-readiness${phase === "intro" ? " ff-readiness-intro" : ""}`} data-quiz-id="worldcup" data-care-step={careStep} style={isResult && winner ? backdropStyle(winner) : undefined}>
    <ReadinessAppBar title="이상형 월드컵" className={phase === "intro" ? "ff-readiness-intro-appbar" : ""} onBack={previous} />
    {phase !== "intro" && !isResult && <div className="ff-readiness-progress" role="progressbar" aria-label="이상형 월드컵 진행률" aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(progressPercent)}><div style={{ width: `${progressPercent}%` }} /></div>}
    {phase === "intro" ? <section className="ff-readiness-intro-content" aria-labelledby="worldcup-intro-title"><div className="ff-readiness-intro-badge">이상형 월드컵</div><h1 id="worldcup-intro-title">나와 인연이 될<br />친구를 찾아볼까요?</h1>{member?.admin && <ActionButton size="small" variant="neutralWeak" loading={loading} onClick={() => void previewResult()}>관리자 · 결과 화면 미리보기</ActionButton>}</section>
    : isResult && winner ? <section className="ff-care-result" aria-label="이상형 월드컵 결과">
      <WorldCupCard ref={cardRef} headline={member?.name.trim() ? `${member.name.trim().slice(0, 8)}님과 이어진 친구` : "나와 이어진 친구"} breed={cardBreed(winner)} number={winner.name.split(" · ")[1] ?? ""} meta={meta(winner)} shelter={winner.shelter} assets={cardReady ? cardAssets : null} />
      <p className="ff-care-result-note">이 친구를 가족과 친구에게도 알려 주세요.</p>
      <ActionButton size="large" variant="ghost" className="ff-worldcup-share" disabled={!cardReady} loading={sharing} onClick={() => void share(winner)}><IconArrowUpBracketDownLine aria-hidden />공유하기</ActionButton>
    </section>
    : phase === "match" && bracket && roundIntro !== null ? <section className="ff-care-step ff-worldcup-round" aria-labelledby="care-step-title">
      <h1 id="care-step-title" className="ff-visually-hidden">{roundLabel(roundIntro)} 시작</h1>
      {/* 화면 어디를 눌러도 대결로 넘어갑니다. 글자와 실 외에 다른 안내 문구는 두지 않습니다. */}
      <button type="button" className="ff-worldcup-round-button" onClick={() => setRoundIntro(null)} aria-label={`${roundLabel(roundIntro)} 시작, 누르면 계속`}>
        <span className="ff-worldcup-round-heading" aria-hidden>
          <span className="ff-worldcup-round-title">{roundLabel(roundIntro)}</span>
          <span className="ff-worldcup-round-sub">{roundIntro === 2 ? "이제 마지막 선택만 남았어요" : `선택한 ${KOREAN_COUNT[roundIntro] ?? roundIntro} 친구가 남았어요`}</span>
        </span>
        <span className="ff-worldcup-round-string-wrap"><Image className="ff-worldcup-round-string" src="/worldcup-string.webp" alt="" width={1600} height={533} unoptimized priority /></span>
      </button>
    </section>
    : phase === "match" && bracket && pair ? <section className="ff-care-step" aria-labelledby="care-step-title">
      <p className="ff-care-step-count">{roundLabel(bracket.round.length)} · {bracket.index / 2 + 1}/{Math.ceil(bracket.round.length / 2)}</p>
      <h1 id="care-step-title">어느 친구가 더 마음에 드나요?</h1>
      <p className="ff-care-helper">사진을 누르면 그 친구의 사진을 모두 볼 수 있고, 아래 선택을 누르면 다음 대결로 넘어가요.{filled > 0 && ` 비슷한 친구 ${filled}마리를 더했어요.`}</p>
      <div className="ff-worldcup-cards">{pair.map(animal => { const photos = photosOf(animal); return <div className="ff-worldcup-candidate" key={animal.id}>
        {/* 사진 카드 전체가 원본 사진 보기입니다. 고르기는 카드 아래 선택 버튼으로만 합니다. */}
        <button type="button" className="ff-worldcup-photo" onClick={() => openViewer(animal)} aria-label={`${animal.name} 사진 ${photos.length}장 크게 보기`}>
          <div className="ff-animal-image-wrap">
            <AnimalThumbnail key={animal.thumbnail || animal.image} src={animal.thumbnail || animal.image} fallbackSrc={animal.image} alt="" priority />
            <span className="ff-worldcup-more-badge" aria-hidden><IconPicture2StackedLine /></span>
          </div>
        </button>
        {/* 관심 친구 카드와 같은 스크랩 버튼을 사진 오른쪽 위에 둡니다. 사진 버튼 안에 넣을 수 없어(버튼 중첩) 형제로 두고 절대 위치로 올립니다. */}
        <FavoriteButton animalId={animal.id} animalName={animal.name} />
        {/* 이름·나이는 사진과 선택 버튼 사이에 둡니다. 선택 버튼의 aria-label이 같은 내용을 읽어 주므로 시각용입니다. */}
        <div className="ff-worldcup-meta" aria-hidden><strong>{animal.name}</strong><small>{displayAge(animal.age)}</small></div>
        <ActionButton size="medium" variant="neutralWeak" className="ff-worldcup-select" data-picked={picking === animal.id || undefined} onClick={() => select(animal)} aria-label={`${animal.name}, ${displayAge(animal.age)} 선택`}>선택</ActionButton>
      </div>; })}</div>
    </section>
    : <section className="ff-care-step" aria-labelledby="care-step-title" aria-busy={loading}>
      <p className="ff-care-step-count">{stepIndex + 1}/{steps.length}</p>
      {/* 후보를 찾거나 대결을 준비하는 동안은 질문 대신 화면 가운데 로딩을 보여 줍니다. */}
      {loading || !countsReady ? <div className="ff-worldcup-loading" role="status"><LoadingIndicator label={!loading ? "친구 수를 세는 중" : step === "round" ? "대결을 준비하는 중" : "후보를 찾는 중"} /><h1 id="care-step-title">{!loading ? "조건별 친구 수를 세고 있어요" : step === "round" ? "대결을 준비하고 있어요" : "조건에 맞는 친구를 찾고 있어요"}</h1></div>
      : <>{step === "species" && <><h1 id="care-step-title">어떤 친구를 만나고 싶나요?</h1><div className="ff-care-choice-grid"><button type="button" className="ff-care-species-choice" data-selected={draft.species === "cat" || undefined} onClick={() => setDraft(value => ({ ...value, species: "cat", color: value.species === "cat" ? value.color : null }))}><Image src="/cat-selection.webp" alt="" width={104} height={104} unoptimized /><strong>고양이</strong></button><button type="button" className="ff-care-species-choice" data-selected={draft.species === "dog" || undefined} onClick={() => setDraft(value => ({ ...value, species: "dog", color: value.species === "dog" ? value.color : null }))}><Image src="/dog-selection.webp" alt="" width={104} height={104} unoptimized /><strong>강아지</strong></button></div></>}
      {step === "size" && <><h1 id="care-step-title">어느 정도 크기가<br />좋나요?</h1><p className="ff-care-helper">품종으로 나눈 크기예요. 믹스·품종 미상 친구는 상관없음에서만 만나요.</p><div className="ff-care-size-grid" role="group" aria-label="크기">{SIZE_OPTIONS.map(([value, label]) => <button type="button" className="ff-care-size-choice" aria-pressed={draft.size?.includes(value) ?? false} data-selected={draft.size?.includes(value) || undefined} key={value} onClick={() => setDraft(current => ({ ...current, size: toggleValue(current.size, value) }))}>{label}{countOf(value) !== undefined && <small>{countOf(value)?.toLocaleString("ko-KR")}마리</small>}</button>)}</div></>}
      {/* 털색은 선택지가 많아 큰 버튼 대신 SEED 칩(토글)으로 줄여 보여 줍니다. name을 고정해야 SSR과 클라이언트의 input name이 같습니다. */}
      {step === "color" && <><h1 id="care-step-title">어떤 털색이<br />마음에 드나요?</h1><p className="ff-care-helper">여러 개 고를 수 있어요.</p><div className="ff-worldcup-chips" role="group" aria-label="털색">{["상관없음", ...(draft.species === "cat" ? CAT_COLORS : DOG_COLORS)].map(label => { const value = label === "상관없음" ? "all" : label; return <Chip.Toggle key={value} inputProps={{ name: "worldcup-color", value }} size="large" checked={draft.color?.includes(value) ?? false} onCheckedChange={() => setDraft(current => ({ ...current, color: toggleValue(current.color, value) }))}><Chip.Label>{label}{countOf(value) !== undefined && <span className="ff-worldcup-chip-count">{countOf(value)?.toLocaleString("ko-KR")}마리</span>}</Chip.Label></Chip.Toggle>; })}</div></>}
      {step === "round" && page && <><h1 id="care-step-title">몇 강으로<br />시작할까요?</h1><div className="ff-care-size-grid"><button type="button" className="ff-care-size-choice" data-selected={roundSize === 16 || undefined} onClick={() => setRoundSize(16)}>16강</button>{usable >= 32 && <button type="button" className="ff-care-size-choice" data-selected={roundSize === 32 || undefined} onClick={() => setRoundSize(32)}>32강</button>}</div>{empty ? <p className="ff-care-helper">조건을 넓혀도 대결할 친구가 부족해요. 조건을 바꿔 다시 골라 주세요.</p> : shortBy > 0 ? <p className="ff-care-helper">조건에 맞는 친구가 부족해 비슷한 친구 {shortBy}마리를 더해요.</p> : null}</>}</>}
    </section>}
    {/* 대결 화면은 카드 아래 선택 버튼이 곧 다음이라 하단 버튼이 없습니다. */}
    {phase !== "match" && <div className={`ff-readiness-actions ${isResult ? "is-result" : "is-single"}`}>
      {phase === "intro" ? <ActionButton size="large" variant="brandSolid" className="ff-grow" onClick={next}>시작하기</ActionButton>
      : isResult && winner ? <><ActionButton size="large" variant="neutralWeak" className="ff-grow" loading={saving} disabled={!cardReady || saving} onClick={() => void saveCard(winner)}><IconArrowDownLine aria-hidden />카드 저장</ActionButton><ActionButton size="large" variant="brandSolid" className="ff-grow" asChild><a href={`/friends/${winner.id}`}>이 친구 알아보기<IconChevronRightLine aria-hidden /></a></ActionButton></>
      : empty ? <ActionButton size="large" variant="neutralWeak" className="ff-grow" onClick={() => { setEmpty(false); setStepIndex(0); }}>조건 다시 고르기</ActionButton>
      : <ActionButton size="large" variant="brandSolid" className="ff-grow" disabled={!canContinue || loading} loading={loading} onClick={next}>{step === "color" ? "후보 찾기" : step === "round" ? "시작하기" : "다음"}</ActionButton>}
    </div>}
    {/* 원본 사진 뷰어: 상세 페이지 갤러리(AnimalGallery)의 ff-image-dialog 구조를 그대로 씁니다. */}
    <dialog ref={dialogRef} className="ff-image-dialog" tabIndex={-1} onClose={() => setViewer(null)}>
      {viewer && <div className="ff-image-dialog-inner">
        <div className="ff-image-dialog-actions">
          {phase === "match" && <button type="button" className="ff-worldcup-viewer-pick" onClick={() => { closeViewer(); pick(viewer.animal); }}>이 친구 선택</button>}
          <button type="button" onClick={closeViewer} aria-label="사진 닫기"><IconXmarkLine /></button>
        </div>
        {/* eslint-disable-next-line @next/next/no-img-element -- 공공데이터 원본 사진을 그대로 보여 줍니다 */}
        <img src={optimizedAnimalImageUrl(viewerPhotos[viewer.index] ?? viewer.animal.image)} alt={`${viewer.animal.name}의 등록 사진 ${viewer.index + 1}`} />
        {viewerPhotos.length > 1 && <div className="ff-image-dialog-nav">{viewerPhotos.map((src, index) => <button type="button" key={src} data-active={index === viewer.index} onClick={() => setViewer({ animal: viewer.animal, index })} aria-label={`${viewerPhotos.length}장 중 ${index + 1}번째 사진 보기`}>
          {/* eslint-disable-next-line @next/next/no-img-element -- 뷰어 하단 썸네일 */}
          <img src={optimizedAnimalImageUrl(src)} alt="" /><span>{index + 1}</span>
        </button>)}</div>}
      </div>}
    </dialog>
  </div>;
}
