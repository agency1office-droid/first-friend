"use client";

import { useMemo, useState } from "react";
import { ActionButton } from "seed-design/ui/action-button";
import { Callout } from "seed-design/ui/callout";
import { IconCheckmarkCircleFill, IconCheckmarkShieldFill, IconChevronLeftLine, IconLightbulbDot5Fill, IconXmarkLine } from "@karrotmarket/react-monochrome-icon";
import { educationScore as calculateEducation } from "../../lib/readiness-score";

type Species = "cat" | "dog";
type Profile = { homeAllowed: string; homeType: string; household: string; absence: number; careMinutes: number; safety: string; currentPets: string; longAbsence: string; experience: string };
type Question = { chapter: string; question: string; options: string[]; answer: number; explanation: string };

const initialProfile: Profile = { homeAllowed: "yes", homeType: "apartment", household: "yes", absence: 6, careMinutes: 60, safety: "ready", currentPets: "none", longAbsence: "ready", experience: "first" };

const commonChapters: Question[] = [
  { chapter: "생활 환경", question: "입양 첫날 가장 좋은 준비는 무엇인가요?", options: ["집 전체를 바로 구경시켜요", "조용한 적응 공간과 물·화장실을 준비해요", "친구들을 불러 함께 환영해요"], answer: 1, explanation: "새 환경에서는 작고 조용한 공간에서 스스로 적응할 시간을 주세요." },
  { chapter: "비용과 돌봄", question: "예상 밖의 병원비는 어떻게 준비하면 좋을까요?", options: ["아프지 않을 거라 생각해요", "비상자금과 도움받을 계획을 미리 세워요", "필요할 때 주변에 부탁해요"], answer: 1, explanation: "진료비는 예측하기 어려워요. 비상자금과 이동·상담 계획을 함께 준비해 주세요." },
  { chapter: "건강과 안전", question: "반려동물이 불편해하는 신호를 보이면 어떻게 해야 할까요?", options: ["며칠 더 지켜봐요", "사람 약을 먼저 먹여요", "보호센터나 동물병원에 상담해요"], answer: 2, explanation: "평소와 다른 증상이 보이면 지체하지 말고 보호센터나 동물병원에 확인해 주세요." },
  { chapter: "평생 책임", question: "더 이상 돌보기 어려운 상황이 생기면 어떻게 해야 할까요?", options: ["몰래 다른 사람에게 보내요", "밖에 풀어줘요", "보호자·보호센터에 알리고 안전한 해결을 찾아요"], answer: 2, explanation: "어려움은 일찍 알리고 보호센터와 전문가에게 안전한 방법을 함께 찾아야 해요." },
];

const speciesSafety: Record<Species, Question["options"]> = {
  cat: ["창문을 조금만 열어둬요", "튼튼한 방묘창·방묘문을 설치해요", "높은 층이면 괜찮아요"],
  dog: ["목줄 없이 자유롭게 걸어요", "몸에 맞는 하네스·리드줄·인식표를 확인해요", "짧은 줄이면 충분해요"],
};

export function ReadinessQuiz({ onClose = () => {} }: { onClose?: () => void }) {
  const [phase, setPhase] = useState<"intro" | "species" | "questions" | "result">("intro");
  const [step, setStep] = useState(0);
  const [species, setSpecies] = useState<Species>("cat");
  const profile = initialProfile;
  const [answers, setAnswers] = useState<Record<number, number>>({});
  const [saved, setSaved] = useState<"idle" | "saved" | "signin" | "error">("idle");
  const [showResult, setShowResult] = useState(false);
  const questions = useMemo(() => commonChapters.map((question, index) => index === 2 ? { ...question, question: species === "cat" ? "고양이의 창문·방묘 안전을 위해 가장 필요한 것은 무엇인가요?" : "강아지의 산책·이동 안전을 위해 가장 필요한 것은 무엇인가요?", options: speciesSafety[species], answer: 1, explanation: species === "cat" ? "추락과 탈출은 짧은 순간에 일어날 수 있어요. 고정된 방묘 장치를 준비해 주세요." : "낯선 환경에서의 이탈을 막을 수 있도록 몸에 맞는 안전장비와 인식표를 준비해 주세요." } : question), [species]);
  const submittedAnswers = questions.map((_, index) => answers[index]);
  const educationScore = calculateEducation(submittedAnswers);
  const passed = educationScore >= 80;
  async function saveResult() { setSaved("idle"); const response = await fetch("/api/readiness", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ species, profile, answers: submittedAnswers }) }); if (response.ok) setSaved("saved"); else if (response.status === 401) setSaved("signin"); else setSaved("error"); }
  function next() {
    if (phase === "intro") { setPhase("species"); return; }
    if (phase === "species") { setPhase("questions"); setStep(0); return; }
    if (phase === "questions" && step < questions.length - 1) { setStep((current) => current + 1); return; }
    setPhase("result");
    setShowResult(true);
    if (passed) void saveResult();
  }
  function previous() {
    if (phase === "result") { setPhase("questions"); setShowResult(false); setStep(questions.length - 1); return; }
    if (phase === "questions" && step > 0) { setStep((current) => current - 1); return; }
    if (phase === "questions") { setPhase("species"); return; }
    setPhase("intro");
  }

  const questionIndex = step;
  const question = questions[questionIndex];
  const totalPages = questions.length + 3;
  const pageNumber = phase === "intro" ? 1 : phase === "species" ? 2 : phase === "questions" ? step + 3 : totalPages;
  return <div className={`ff-readiness ff-readiness-${phase}`}>
    <header className={`ff-readiness-appbar${phase === "intro" ? " ff-readiness-intro-appbar" : ""}`}>
      <button type="button" className="ff-readiness-back" onClick={phase === "intro" ? onClose : previous} aria-label="이전으로"><IconChevronLeftLine aria-hidden /></button>
      <button type="button" className="ff-readiness-close" onClick={onClose} aria-label="입양 전 준비 확인 닫기"><IconXmarkLine aria-hidden /></button>
      <strong>입양 전 준비 확인</strong>
    </header>
    {phase !== "intro" && <div className="ff-readiness-progress-meta"><strong>{pageNumber}/{totalPages}</strong></div>}

    {phase === "intro" && <section className="ff-readiness-intro-content" aria-labelledby="readiness-intro-title"><div className="ff-readiness-intro-badge">퍼스트프렌드 준비 가이드</div><h1 id="readiness-intro-title">반려동물과<br />함께할 준비하기</h1><p className="ff-readiness-intro-lead">입양 전 꼭 알아야 할 내용을<br />가볍게 확인해 보세요.</p><div className="ff-readiness-intro-visual" aria-hidden><span>오늘부터 시작하는</span><strong>우리의 준비 이야기</strong><b>🐾</b><em>함께 준비해 볼까요?</em></div><p className="ff-readiness-intro-note">총 4개 챕터 · 약 2분</p></section>}

    {phase === "species" && <section className="ff-readiness-species-page" aria-labelledby="readiness-species-title"><h1 id="readiness-species-title">어떤 친구를 만나고 싶나요?</h1><div className="ff-readiness-species-grid" role="group" aria-label="입양을 준비하는 동물"><button type="button" className="ff-readiness-species-choice" data-selected={species === "cat" || undefined} aria-pressed={species === "cat"} onClick={() => setSpecies("cat")}><span className="ff-readiness-species-emoji" aria-hidden>🐱</span><strong>고양이</strong></button><button type="button" className="ff-readiness-species-choice" data-selected={species === "dog" || undefined} aria-pressed={species === "dog"} onClick={() => setSpecies("dog")}><span className="ff-readiness-species-emoji" aria-hidden>🐶</span><strong>강아지</strong></button></div><div className="ff-readiness-tip"><strong>💡 꿀팁</strong><p>고양이와 강아지는 생활 환경과 돌봄 방식이 달라요. 지금 고른 친구에 맞춰 다음 내용을 안내해 드릴게요.</p></div></section>}

    {phase === "questions" && <section className="ff-readiness-chapter" aria-labelledby="readiness-question-title"><div className="ff-readiness-chapter-kicker">CHAPTER {step + 1}</div><h2 id="readiness-question-title">{question.question}</h2><fieldset className="ff-quiz-question ff-quiz-question-single"><legend className="ff-visually-hidden">{question.question}</legend>{question.options.map((option, optionIndex) => <label key={option}><input type="radio" name={`readiness-chapter-${questionIndex}`} checked={answers[questionIndex] === optionIndex} onChange={() => setAnswers((current) => ({ ...current, [questionIndex]: optionIndex }))} /><span>{option}</span></label>)}</fieldset>{answers[questionIndex] !== undefined && <div className="ff-readiness-tip"><strong>💡 준비 팁</strong><p>{question.explanation}</p></div>}</section>}

    {showResult && <section className="ff-result ff-readiness-result" role="status"><div className={`ff-readiness-result-icon${passed ? " is-passed" : ""}`}>{passed ? <IconCheckmarkCircleFill /> : <IconCheckmarkShieldFill />}</div><h2 className="ff-section-title">{passed ? "필수 교육을 완료했어요" : "조금만 더 확인하면 돼요"}</h2><p className="ff-description">이 결과는 입양 전 필수 내용을 확인했는지 보여주는 참고 정보예요. 사람이나 동물을 평가하거나 자동 입양 거절에 사용하지 않습니다.</p><div className="ff-result-groups"><div><h3><IconCheckmarkCircleFill />잘 준비한 점</h3><p>주거와 돌봄 시간을 기준으로 입양 전 준비를 확인했어요.</p></div><div><h3><IconLightbulbDot5Fill />입양 전 준비할 점</h3><p>{profile.household !== "yes" ? "동거인과 책임과 비용을 더 이야기해 주세요." : "첫 일주일 적응 기간의 일정을 비워두세요."}</p></div></div>{!passed && <Callout tone="warning" title="다시 확인해 주세요" description="틀린 챕터의 해설을 확인한 뒤 다시 풀 수 있어요." />}{saved === "saved" && <Callout tone="positive" title="결과를 안전하게 저장했어요" description="이제 입양 신청을 시작할 수 있어요." />}{saved === "signin" && <Callout tone="informative" title="결과를 저장해 주세요" description="결과를 저장하려면 퍼스트프렌드 계정 로그인이 필요해요." linkProps={{ href: "/login?return_to=%2Freadiness", children: "로그인" }} />}{saved === "error" && <Callout tone="critical" description="결과를 저장하지 못했어요. 잠시 후 다시 시도해 주세요." />}</section>}

    <footer className={`ff-readiness-actions${phase === "intro" || phase === "species" ? " is-single" : ""}`}>{phase === "result" ? <><ActionButton size="large" variant="neutralWeak" onClick={() => { setPhase("intro"); setShowResult(false); setStep(0); }}>다시 확인하기</ActionButton><ActionButton size="large" className="ff-grow" asChild><a href="/find">입양할 친구 찾기</a></ActionButton></> : phase === "intro" ? <ActionButton size="large" className="ff-grow" onClick={next}>시작하기</ActionButton> : phase === "species" ? <ActionButton size="large" className="ff-grow" onClick={next}>다음</ActionButton> : <><ActionButton size="large" variant="neutralWeak" onClick={previous}>이전</ActionButton><ActionButton size="large" className="ff-grow" disabled={answers[questionIndex] === undefined} onClick={next}>{step === questions.length - 1 ? "결과 보기" : "다음"}</ActionButton></>}</footer>
  </div>;
}
