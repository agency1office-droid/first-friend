"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import { ActionButton } from "seed-design/ui/action-button";
import { IconPicture2StackedLine, IconXmarkLine } from "@karrotmarket/react-monochrome-icon";
import type { Animal } from "../../lib/data";
import type { AnimalPage } from "../../lib/public-animal-store";
import { optimizedAnimalImageUrl } from "../../lib/image-url";
import { buildFindHref, choose, currentPair, isDone, pickPool, poolQueries, progress, roundLabel, startBracket, winnerOf, type Answers, type Bracket } from "../../lib/worldcup";
import { AnimalCard } from "./AnimalCard";
import { AnimalThumbnail } from "./AnimalThumbnail";
import { useAppFeedback } from "./AppFeedback";
import { closeToDetail } from "./detailReturn";
import { ReadinessAppBar } from "./ReadinessAppBar";

// 화면 구조·클래스는 입양 환경 점검(CareReadinessFlow)과 같습니다. 앱바 → 진행 바 → 인트로/단계/결과 → 하단 버튼.
type Species = "cat" | "dog";
type Step = "species" | "size" | "color" | "round";
type Phase = "intro" | "steps" | "match" | "result";
type Draft = { species: Species | null; size: string | null; color: string | null };

const EMPTY_DRAFT: Draft = { species: null, size: null, color: null };
// 크기 기준은 공공 데이터 체중 분류(lib/public-animal-store.ts sizeGroup)와 같습니다.
const SIZE_OPTIONS = [["small", "소형"], ["medium", "중형"], ["large,xlarge", "대형"], ["all", "상관없음"]] as const;
const DOG_COLORS = ["흰색", "검정", "갈색", "황색", "회색", "기타·복합색"];
const CAT_COLORS = ["흰색", "검정", "갈색", "황색", "회색", "삼색", "고등어", "치즈", "기타·복합색"];

function stepsFor(species: Species | null): Step[] {
  return species === "cat" ? ["species", "color", "round"] : ["species", "size", "color", "round"];
}
// 지역은 전국, 나이대는 제한 없음으로 고정합니다. 나이대는 결과의 닮은 친구 링크에서 선택 결과로 추론합니다.
function toAnswers(draft: Draft): Answers {
  return { species: draft.species ?? "dog", scope: "nationwide", size: draft.size ?? "all", age: "all", color: draft.color ?? "all" };
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
async function fetchPage(query: string) {
  const response = await fetch(`/api/animals?${query}`, { cache: "no-store" });
  const body = await response.json() as AnimalPage & { error?: string };
  if (!response.ok) throw new Error(body.error || "후보를 불러오지 못했어요.");
  return body;
}
function exitFlow() {
  if (new URLSearchParams(window.location.search).get("return_to")) closeToDetail();
  else window.location.assign("/find");
}

export function WorldCupFinder() {
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
  const [selected, setSelected] = useState<Animal | null>(null);
  const [viewer, setViewer] = useState<{ animal: Animal; index: number } | null>(null);
  const dialogRef = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const scroller = document.querySelector<HTMLElement>(".ff-quiz-shell .ff-readiness > section");
    if (scroller) scroller.scrollTop = 0;
    else window.scrollTo(0, 0);
  }, [phase, stepIndex, bracket]);

  const steps = stepsFor(draft.species);
  const step = steps[stepIndex];
  const answers = toAnswers(draft);
  const usable = page ? page.items.filter(animal => animal.image.trim()).length : 0;
  const shortBy = Math.max(0, roundSize - usable);
  const canContinue = step === "species" ? draft.species !== null : step === "size" ? draft.size !== null : step === "color" ? draft.color !== null : !empty;
  const stepProgress = Math.max((stepIndex / steps.length) * 100, 6.25);
  const isResult = phase === "result";

  async function loadPool() {
    setLoading(true);
    try {
      setPage(await fetchPage(poolQueries(answers, null)[0]));
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
      setPool(picked.pool); setFilled(picked.filled); setHistory([]); setSelected(null);
      setBracket(startBracket(picked.pool, Math.random));
      setPhase("match");
    } catch (error) {
      feedback.error(error instanceof Error ? error.message : "후보를 불러오지 못했어요.");
    } finally {
      setLoading(false);
    }
  }

  function next() {
    if (phase === "intro") { setPhase("steps"); setStepIndex(0); return; }
    if (phase === "match") {
      if (!bracket || !selected) return;
      const following = choose(bracket, selected);
      setHistory(value => [...value, bracket]); setBracket(following); setSelected(null);
      if (isDone(following)) setPhase("result");
      return;
    }
    if (!canContinue) return;
    if (step === "color") { void loadPool(); return; }
    if (step === "round") { void startMatch(); return; }
    setStepIndex(value => value + 1);
  }

  function previous() {
    if (phase === "intro") return exitFlow();
    if (phase === "match") {
      const last = history.at(-1);
      if (last) { setHistory(value => value.slice(0, -1)); setBracket(last); setSelected(null); return; }
      setPhase("steps"); setStepIndex(steps.length - 1); return;
    }
    if (phase === "result") { setPhase("steps"); setStepIndex(steps.length - 1); setBracket(null); return; }
    if (stepIndex === 0) return exitFlow();
    setStepIndex(value => value - 1);
  }

  function retry() {
    setPhase("steps"); setStepIndex(0); setDraft(EMPTY_DRAFT); setPage(null); setRoundSize(16); setEmpty(false); setPool([]); setFilled(0); setBracket(null); setHistory([]); setSelected(null);
  }

  // 사진을 누르면 원본 사진을 모두 보여 줍니다. 목록 사진은 잘려 있거나 얼굴이 두 번째 사진에만 있을 수 있어요.
  function openViewer(animal: Animal) {
    setViewer({ animal, index: 0 });
    dialogRef.current?.showModal();
  }
  function closeViewer() {
    dialogRef.current?.close();
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

  const pair = phase === "match" && bracket ? currentPair(bracket) : null;
  const winner = isResult && bracket ? winnerOf(bracket) : null;
  const careStep = phase === "intro" ? "intro" : isResult ? "result" : phase === "match" ? "match" : step;
  const progressPercent = isResult ? 100 : phase === "match" && bracket ? Math.max(progress(bracket) * 100, 6.25) : stepProgress;
  const viewerPhotos = viewer ? photosOf(viewer.animal) : [];

  return <div className={`ff-readiness ff-care-readiness${phase === "intro" ? " ff-readiness-intro" : ""}`} data-quiz-id="worldcup" data-care-step={careStep}>
    <ReadinessAppBar title="이상형 월드컵" className={phase === "intro" ? "ff-readiness-intro-appbar" : ""} onBack={previous} />
    {phase !== "intro" && <div className="ff-readiness-progress" role="progressbar" aria-label="이상형 월드컵 진행률" aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(progressPercent)}><div style={{ width: `${progressPercent}%` }} /></div>}
    {phase === "intro" ? <section className="ff-readiness-intro-content" aria-labelledby="worldcup-intro-title"><div className="ff-readiness-intro-badge">첫 친구 이상형 월드컵</div><h1 id="worldcup-intro-title">보호 중인 친구들 중<br />내 첫 친구를 찾아볼까요?</h1><p className="ff-readiness-intro-lead">조건을 고르면 실제 보호동물 16마리가 대결해요.<br />끝까지 남은 친구를 바로 만나러 갈 수 있어요.</p></section>
    : isResult && winner ? <section className="ff-care-result" aria-labelledby="care-result-title">
      <h1 id="care-result-title">내 첫 친구 이상형</h1>
      <AnimalCard animal={winner} layout="photo" priority />
      <p className="ff-care-result-summary">{(bracket?.size ?? 1) - 1}번의 선택으로 만난 <strong>{winner.name}</strong><br />{meta(winner)} · {winner.shelter}</p>
      <div className="ff-worldcup-actions">
        <ActionButton size="large" variant="neutralWeak" onClick={() => void share(winner)}>공유하기</ActionButton>
        <ActionButton size="large" variant="neutralWeak" asChild><a href={buildFindHref(answers, bracket?.picks ?? [])}>닮은 친구 더 보기</a></ActionButton>
      </div>
      <section className="ff-worldcup-others" aria-labelledby="worldcup-others-title">
        <h2 id="worldcup-others-title">함께 대결한 친구들</h2>
        <div className="ff-animal-list">{pool.filter(animal => animal.id !== winner.id).map(animal => <AnimalCard key={animal.id} animal={animal} layout="row" showShelter={false} />)}</div>
      </section>
      <p className="ff-care-result-note">입양 문의를 누르면 친구의 상세 페이지에서 보호소에 바로 연락할 수 있어요.</p>
    </section>
    : phase === "match" && bracket && pair ? <section className="ff-care-step" aria-labelledby="care-step-title">
      <p className="ff-care-step-count">{roundLabel(bracket.round.length)} · {bracket.index / 2 + 1}/{Math.ceil(bracket.round.length / 2)}</p>
      <h1 id="care-step-title">더 끌리는 친구를 골라주세요.</h1>
      <p className="ff-care-helper">사진을 누르면 등록된 사진을 모두 볼 수 있어요.{filled > 0 && ` 비슷한 친구 ${filled}마리를 더했어요.`}</p>
      <div className="ff-worldcup-cards">{pair.map(animal => { const photos = photosOf(animal); const isSelected = selected?.id === animal.id; return <div className="ff-worldcup-candidate" data-selected={isSelected || undefined} key={animal.id}>
        <button type="button" className="ff-worldcup-photo" onClick={() => openViewer(animal)} aria-label={`${animal.name} 사진 ${photos.length}장 크게 보기`}>
          <div className="ff-animal-image-wrap"><AnimalThumbnail key={animal.thumbnail || animal.image} src={animal.thumbnail || animal.image} fallbackSrc={animal.image} alt="" priority />{photos.length > 1 && <span className="ff-card-photo-count" aria-hidden><IconPicture2StackedLine /></span>}</div>
        </button>
        <button type="button" className="ff-worldcup-pick" aria-pressed={isSelected} onClick={() => setSelected(animal)}><strong>{animal.name}</strong><small>{meta(animal)}</small><span className="ff-worldcup-pick-label">{isSelected ? "선택했어요" : "이 친구 선택"}</span></button>
      </div>; })}</div>
    </section>
    : <section className="ff-care-step" aria-labelledby="care-step-title">
      <p className="ff-care-step-count">{stepIndex + 1}/{steps.length}</p>
      {step === "species" && <><h1 id="care-step-title">어떤 친구를 만나고 싶나요?</h1><div className="ff-care-choice-grid"><button type="button" className="ff-care-species-choice" data-selected={draft.species === "cat" || undefined} onClick={() => setDraft(value => ({ ...value, species: "cat", size: null }))}><Image src="/cat-selection.webp" alt="" width={104} height={104} unoptimized /><strong>고양이</strong></button><button type="button" className="ff-care-species-choice" data-selected={draft.species === "dog" || undefined} onClick={() => setDraft(value => ({ ...value, species: "dog" }))}><Image src="/dog-selection.webp" alt="" width={104} height={104} unoptimized /><strong>강아지</strong></button></div><p className="ff-care-helper">입양 매칭은 개와 고양이만 보여요.</p></>}
      {step === "size" && <><h1 id="care-step-title">어느 정도 크기가<br />좋나요?</h1><p className="ff-care-helper">홈에서 사용하는 크기 기준과 같아요.</p><div className="ff-care-size-grid">{SIZE_OPTIONS.map(([value, label]) => <button type="button" className="ff-care-size-choice" data-selected={draft.size === value || undefined} key={value} onClick={() => setDraft(current => ({ ...current, size: value }))}>{label}</button>)}</div></>}
      {step === "color" && <><h1 id="care-step-title">어떤 털색에<br />끌리나요?</h1><div className="ff-care-size-grid">{[...(draft.species === "cat" ? CAT_COLORS : DOG_COLORS), "상관없음"].map(label => { const value = label === "상관없음" ? "all" : label; return <button type="button" className="ff-care-size-choice" data-selected={draft.color === value || undefined} key={value} onClick={() => setDraft(current => ({ ...current, color: value }))}>{label}</button>; })}</div></>}
      {step === "round" && page && <><h1 id="care-step-title">몇 강으로<br />시작할까요?</h1><div className="ff-care-size-grid"><button type="button" className="ff-care-size-choice" data-selected={roundSize === 16 || undefined} onClick={() => setRoundSize(16)}>16강</button>{usable >= 32 && <button type="button" className="ff-care-size-choice" data-selected={roundSize === 32 || undefined} onClick={() => setRoundSize(32)}>32강</button>}</div>{empty ? <p className="ff-care-helper">조건을 넓혀도 대결할 친구가 부족해요. 조건을 바꿔 다시 골라 주세요.</p> : shortBy > 0 ? <p className="ff-care-helper">조건에 맞는 친구가 부족해 비슷한 친구 {shortBy}마리를 더해요.</p> : null}</>}
    </section>}
    <div className={`ff-readiness-actions ${isResult ? "is-result" : "is-single"}`}>
      {phase === "intro" ? <ActionButton size="large" variant="brandSolid" className="ff-grow" onClick={next}>시작하기</ActionButton>
      : isResult && winner ? <><ActionButton size="large" variant="neutralWeak" className="ff-grow" onClick={retry}>다시 하기</ActionButton><ActionButton size="large" variant="brandSolid" className="ff-grow" asChild><a href={`/friends/${winner.id}`}>입양 문의하기</a></ActionButton></>
      : phase === "match" ? <ActionButton size="large" variant="brandSolid" className="ff-grow" disabled={!selected} onClick={next}>{bracket && bracket.round.length === 2 ? "결과 보기" : "다음"}</ActionButton>
      : empty ? <ActionButton size="large" variant="neutralWeak" className="ff-grow" onClick={() => { setEmpty(false); setStepIndex(0); }}>조건 다시 고르기</ActionButton>
      : <ActionButton size="large" variant="brandSolid" className="ff-grow" disabled={!canContinue || loading} loading={loading} onClick={next}>{step === "color" ? "후보 찾기" : step === "round" ? "시작하기" : "다음"}</ActionButton>}
    </div>
    {/* 원본 사진 뷰어: 상세 페이지 갤러리(AnimalGallery)의 ff-image-dialog 구조를 그대로 씁니다. */}
    <dialog ref={dialogRef} className="ff-image-dialog" tabIndex={-1} onClose={() => setViewer(null)}>
      {viewer && <div className="ff-image-dialog-inner">
        <div className="ff-image-dialog-actions">
          {phase === "match" && <button type="button" className="ff-worldcup-viewer-pick" onClick={() => { setSelected(viewer.animal); closeViewer(); }}>이 친구 선택</button>}
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
