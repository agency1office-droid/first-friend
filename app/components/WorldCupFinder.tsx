"use client";

import { useRef, useState } from "react";
import type { Animal } from "../../lib/data";
import type { AnimalPage } from "../../lib/public-animal-store";
import { readAllRegions, readHomeLocation, type HomeLocation } from "../../lib/geo";
import { buildFindHref, choose, currentPair, isDone, pickPool, poolQueries, progress, roundLabel, startBracket, winnerOf, type Answers, type Bracket } from "../../lib/worldcup";
import { ActionButton } from "seed-design/ui/action-button";
import { BottomSheetBody, BottomSheetContent, BottomSheetFooter, BottomSheetRoot } from "seed-design/ui/bottom-sheet";
import { Chip } from "seed-design/ui/chip";
import { RadioSelectBoxItem, RadioSelectBoxRoot } from "seed-design/ui/select-box";
import { AnimalCard } from "./AnimalCard";
import { AnimalThumbnail } from "./AnimalThumbnail";
import { useAppFeedback } from "./AppFeedback";
import { loadDefaultHomeLocation } from "./defaultHomeLocation";

type Question = "species" | "scope" | "size" | "age" | "color";
type Step = Question | "start" | "match" | "result";
type Option = { value: string; label: string; description?: string };

const SPECIES: Option[] = [{ value: "dog", label: "강아지" }, { value: "cat", label: "고양이" }];
// 크기 기준은 공공 데이터 체중 분류(lib/public-animal-store.ts sizeGroup)와 같습니다.
const DOG_SIZES: Option[] = [{ value: "small", label: "소형", description: "5kg 미만" }, { value: "medium", label: "중형", description: "5~15kg" }, { value: "large,xlarge", label: "대형", description: "15kg 이상" }, { value: "all", label: "상관없음" }];
const AGES: Option[] = [{ value: "young", label: "어린 친구", description: "1살 이하" }, { value: "adult", label: "청년 친구", description: "2~5살" }, { value: "mature", label: "어른 친구", description: "6~10살" }, { value: "senior", label: "나이 많은 친구", description: "11살 이상" }, { value: "all", label: "상관없음" }];
const DOG_COLORS = ["흰색", "검정", "갈색", "황색", "회색", "기타·복합색"];
const CAT_COLORS = ["흰색", "검정", "갈색", "황색", "회색", "삼색", "고등어", "치즈", "기타·복합색"];
const TITLES: Record<Question, string> = { species: "어떤 친구를 만나고 싶나요?", scope: "어디까지 찾아볼까요?", size: "어느 정도 크기가 좋나요?", age: "어느 나이대가 좋나요?", color: "어떤 털색에 끌리나요?" };
const DEFAULT_ANSWERS: Answers = { species: "dog", scope: "nearby", size: "all", age: "all", color: "all" };

function questionsFor(species: Answers["species"]): Question[] {
  return species === "dog" ? ["species", "scope", "size", "age", "color"] : ["species", "scope", "age", "color"];
}
function displayAge(age: string) {
  if (age.includes("60일미만")) return "60일 미만";
  return age.replace(/^(\d{4})(?:\([^)]*\))*\(년생\)$/, "$1년생");
}
function meta(animal: Animal) {
  return [displayAge(animal.age), animal.sex, animal.region.trim().split(/\s+/).slice(0, 2).join(" ")].filter(Boolean).join(" · ");
}
function labelOf(options: Option[], value: string) {
  return options.find(option => option.value === value)?.label ?? value;
}
async function fetchPage(query: string) {
  const response = await fetch(`/api/animals?${query}`, { cache: "no-store" });
  const body = await response.json() as AnimalPage & { error?: string };
  if (!response.ok) throw new Error(body.error || "후보를 불러오지 못했어요.");
  return body;
}
// 저장된 위치 → 전체 보기 설정이면 전국 → 아무것도 없으면 IP 위치 한 번. 저장은 홈 피드가 맡습니다.
async function resolveLocation() {
  return readHomeLocation() ?? (readAllRegions() ? null : loadDefaultHomeLocation());
}

export function WorldCupFinder() {
  const feedback = useAppFeedback();
  const [step, setStep] = useState<Step>("species");
  const [answers, setAnswers] = useState<Answers>(DEFAULT_ANSWERS);
  const [location, setLocation] = useState<HomeLocation | null>(null);
  const locationRequest = useRef<Promise<HomeLocation | null> | null>(null);
  const [page, setPage] = useState<AnimalPage | null>(null);
  const [roundSize, setRoundSize] = useState(16);
  const [loading, setLoading] = useState(false);
  const [empty, setEmpty] = useState(false);
  const [pool, setPool] = useState<Animal[]>([]);
  const [filled, setFilled] = useState(0);
  const [bracket, setBracket] = useState<Bracket | null>(null);

  function reset() {
    setStep("species"); setAnswers(DEFAULT_ANSWERS); setPage(null); setRoundSize(16); setEmpty(false); setPool([]); setFilled(0); setBracket(null);
  }

  async function loadPool(next: Answers) {
    setLoading(true);
    try {
      const point = await (locationRequest.current ?? Promise.resolve(location));
      setPage(await fetchPage(poolQueries(next, point)[0]));
      setRoundSize(16); setEmpty(false); setStep("start");
    } catch (error) {
      feedback.error(error instanceof Error ? error.message : "후보를 불러오지 못했어요.");
    } finally {
      setLoading(false);
    }
  }

  function answer(value: string) {
    const next = { ...answers, [step]: value } as Answers;
    setAnswers(next);
    if (step === "species") locationRequest.current = resolveLocation().then(found => { setLocation(found); return found; });
    const order = questionsFor(next.species);
    const index = order.indexOf(step as Question);
    if (index < order.length - 1) setStep(order[index + 1]);
    else void loadPool(next);
  }

  async function start() {
    if (!page) return;
    setLoading(true);
    try {
      const queries = poolQueries(answers, location);
      const pages = [page.items];
      let picked = pickPool(pages, roundSize);
      for (let index = 1; index < queries.length && picked.pool.length < roundSize; index += 1) {
        pages.push((await fetchPage(queries[index])).items);
        picked = pickPool(pages, roundSize);
      }
      if (!picked.pool.length) { setEmpty(true); return; }
      setPool(picked.pool); setFilled(picked.filled);
      setBracket(startBracket(picked.pool, Math.random));
      setStep("match");
    } catch (error) {
      feedback.error(error instanceof Error ? error.message : "후보를 불러오지 못했어요.");
    } finally {
      setLoading(false);
    }
  }

  function pick(animal: Animal) {
    if (!bracket) return;
    const next = choose(bracket, animal);
    setBracket(next);
    if (isDone(next)) setStep("result");
  }

  async function share(winner: Animal) {
    const url = `${window.location.origin}/friends/${winner.id}`;
    try {
      if (navigator.share) await navigator.share({ title: `퍼스트 프렌드 · ${winner.name}`, text: `이상형 월드컵에서 끝까지 남은 ${winner.name} 친구예요.`, url });
      else { await navigator.clipboard.writeText(url); feedback.success("공유 링크를 복사했어요"); }
    } catch {
      feedback.error("공유를 완료하지 못했어요");
    }
  }

  if (step === "match" && bracket) {
    const pair = currentPair(bracket);
    if (!pair) return null;
    const percent = Math.round(progress(bracket) * 100);
    return <div className="ff-worldcup ff-worldcup-match">
      <h2>{roundLabel(bracket.round.length)} · {bracket.index / 2 + 1}/{Math.ceil(bracket.round.length / 2)}</h2>
      <div className="ff-worldcup-progress" role="progressbar" aria-label="이상형 월드컵 진행률" aria-valuemin={0} aria-valuemax={100} aria-valuenow={percent}><span style={{ width: `${percent}%` }}/></div>
      <p className="ff-meta" aria-live="polite">전체 {bracket.size - 1}번 중 {bracket.picks.length + 1}번째 선택{filled > 0 && ` · 비슷한 친구 ${filled}마리를 더했어요`}</p>
      <div className="ff-worldcup-pair">{pair.map(animal => <button type="button" key={animal.id} onClick={() => pick(animal)}>
        <div className="ff-animal-image-wrap"><AnimalThumbnail key={animal.thumbnail || animal.image} src={animal.thumbnail || animal.image} fallbackSrc={animal.image} alt="" priority/></div>
        <strong>{animal.name}</strong><small>{meta(animal)}</small>
      </button>)}</div>
    </div>;
  }

  if (step === "result" && bracket) {
    const winner = winnerOf(bracket);
    if (!winner) return null;
    return <div className="ff-worldcup">
      <div className="ff-worldcup-result" aria-live="polite">
        <div className="ff-kicker">{bracket.size - 1}번의 선택으로 만난 내 첫 친구 이상형</div>
        <AnimalCard animal={winner} layout="photo" priority/>
        <h2>{winner.name}</h2>
        <p className="ff-meta">{meta(winner)} · {winner.shelter}</p>
        <div className="ff-worldcup-actions">
          <ActionButton size="large" variant="brandSolid" asChild><a href={`/friends/${winner.id}`}>입양 문의하기</a></ActionButton>
          <ActionButton variant="neutralWeak" onClick={() => void share(winner)}>공유하기</ActionButton>
          <ActionButton variant="neutralWeak" asChild><a href={buildFindHref(answers, bracket.picks)}>닮은 친구 더 보기</a></ActionButton>
          <ActionButton variant="ghost" onClick={reset}>처음부터 다시 하기</ActionButton>
        </div>
      </div>
      <section className="ff-worldcup-others" aria-labelledby="worldcup-others-title">
        <h3 id="worldcup-others-title">함께 대결한 친구들</h3>
        <div className="ff-animal-list">{pool.filter(animal => animal.id !== winner.id).map(animal => <AnimalCard key={animal.id} animal={animal} layout="row" showShelter={false}/>)}</div>
      </section>
    </div>;
  }

  const order = questionsFor(answers.species);
  const question = (step === "start" ? "color" : step) as Question;
  const index = order.indexOf(question);
  const scopeNote = location ? `${location.label} 기준 가까운 순` : readAllRegions() ? "전체 보기 설정이라 전국에서 찾아요" : "위치 정보가 없어 전국에서 찾아요";
  const options: Option[] = question === "species" ? SPECIES
    : question === "scope" ? [{ value: "nearby", label: "가까운 곳", description: scopeNote }, { value: "nationwide", label: "전국", description: "마음에 들면 어디든 만나러 가요" }]
    : question === "size" ? DOG_SIZES
    : question === "age" ? AGES
    : [...(answers.species === "dog" ? DOG_COLORS : CAT_COLORS).map(color => ({ value: color, label: color })), { value: "all", label: "상관없음" }];
  const usable = page ? page.items.filter(animal => animal.image.trim()).length : 0;
  const shortBy = Math.max(0, roundSize - usable);
  const summary = [labelOf(SPECIES, answers.species), answers.scope === "nearby" && location ? location.label : "전국", answers.species === "dog" && answers.size !== "all" ? labelOf(DOG_SIZES, answers.size) : "", answers.age !== "all" ? labelOf(AGES, answers.age) : "", answers.color !== "all" ? answers.color : ""].filter(Boolean).join(" · ");

  return <div className="ff-worldcup ff-worldcup-quiz">
    <div className="ff-worldcup-progress" role="progressbar" aria-label="설문 진행률" aria-valuemin={0} aria-valuemax={order.length} aria-valuenow={index + 1}><span style={{ width: `${(index / order.length) * 100}%` }}/></div>
    <div className="ff-kicker">{index + 1}/{order.length}</div>
    <h2 id="worldcup-question">{TITLES[question]}</h2>
    {/* name을 고정해야 SEED가 useId로 만든 radio name이 서버·클라이언트에서 달라지는 hydration 경고가 없습니다. */}
    <RadioSelectBoxRoot key={question} name={`worldcup-${question}`} aria-labelledby="worldcup-question" columns={question === "color" ? 2 : 1} disabled={loading} onValueChange={value => { if (typeof value === "string") answer(value); }}>
      {options.map(option => <RadioSelectBoxItem key={option.value} value={option.value} label={option.label} description={option.description}/>)}
    </RadioSelectBoxRoot>
    {index > 0 && <div><ActionButton variant="ghost" onClick={() => setStep(order[index - 1])}>이전</ActionButton></div>}
    <BottomSheetRoot open={step === "start"} onOpenChange={open => { if (!open) setStep(order[order.length - 1]); }}>
      <BottomSheetContent title="이제 대결을 시작해요" description={page ? `조건에 맞는 친구 ${page.total.toLocaleString("ko-KR")}마리` : ""}>
        <BottomSheetBody>
          <p className="ff-worldcup-sheet-summary">{summary}</p>
          <Chip.RadioRoot value={String(roundSize)} onValueChange={value => { if (value === "16" || value === "32") setRoundSize(Number(value)); }}>
            <Chip.RadioItem value="16"><Chip.Label>16강</Chip.Label></Chip.RadioItem>
            {usable >= 32 && <Chip.RadioItem value="32"><Chip.Label>32강</Chip.Label></Chip.RadioItem>}
          </Chip.RadioRoot>
          {empty ? <p className="ff-worldcup-sheet-note">조건을 넓혀도 대결할 친구가 부족해요. 조건을 바꿔 다시 골라 주세요.</p>
            : shortBy > 0 ? <p className="ff-worldcup-sheet-note">조건에 맞는 친구가 {usable}마리라 비슷한 친구 {shortBy}마리를 더해요.</p>
            : <p className="ff-worldcup-sheet-note">{usable}마리 중 {roundSize}마리가 대결해요.</p>}
          {answers.scope === "nearby" && !location && <p className="ff-worldcup-sheet-note">{scopeNote}.</p>}
        </BottomSheetBody>
        <BottomSheetFooter>
          {empty ? <ActionButton size="large" variant="neutralWeak" onClick={reset}>조건 다시 고르기</ActionButton>
            : <ActionButton size="large" variant="brandSolid" loading={loading} onClick={() => void start()}>시작하기</ActionButton>}
        </BottomSheetFooter>
      </BottomSheetContent>
    </BottomSheetRoot>
  </div>;
}
