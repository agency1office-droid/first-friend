"use client";
import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import { ActionButton } from "seed-design/ui/action-button";
import { RadioGroup, RadioGroupItem } from "seed-design/ui/radio-group";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "seed-design/ui/accordion";
import { IconArrowDownLine, IconArrowClockwiseCircularLine, IconChevronLeftLine, IconHouseLine } from "@karrotmarket/react-monochrome-icon";
import { CertificateResult, type CertificateHandle } from "./CertificateCard";
import { closeToDetail } from "./detailReturn";
import { saveQuizCompletion } from "../../lib/quiz-completion";
import { careSections, careStatus, careAnswerScore, evaluateCare, type CareAnswer, type CareAnswers } from "../../lib/care-readiness";

export function CareReadinessFlow({ memberName = null, admin = false }: { memberName?: string | null; admin?: boolean } = {}) {
  const [started, setStarted] = useState(false);
  const [isPreview, setIsPreview] = useState(false);
  const [step, setStep] = useState(0);
  const [species, setSpecies] = useState<"cat" | "dog" | null>(null);
  const [answers, setAnswers] = useState<CareAnswers>({});
  const sections = careSections(species ?? "dog");
  const totalSteps = sections.length + 1;
  const isResult = step === totalSteps;
  const section = sections[step - 1];
  const canContinue = step === 0 ? species !== null : Boolean(section?.questions.every(q => answers[q.id]));
  const result = evaluateCare(answers, species ?? "dog");
  const { score, tone, message } = result;
  const title = tone === "gold" ? "준비된 예비 반려인" : tone === "silver" ? "차근차근 준비하는 예비 반려인" : "첫걸음을 시작한 예비 반려인";
  const certRef = useRef<CertificateHandle>(null);
  useEffect(() => {
    if (started && isResult && !isPreview) saveQuizCompletion("care-readiness", score / 100, message);
  }, [started, isResult, isPreview, score, message]);

  function previous() {
    if (!started || step === 0) return closeToDetail();
    setStep(value => value - 1);
  }
  function preview() {
    setIsPreview(true);
    setSpecies("dog");
    setAnswers(Object.fromEntries(careSections("dog").flatMap(s => s.questions.map(q => [q.id, "ready" as const]))));
    setStarted(true);
    setStep(totalSteps);
  }
  function retry() {
    setIsPreview(false);
    setAnswers({});
    setSpecies(null);
    setStep(0);
  }

  return <div className={`ff-readiness ff-care-readiness${!started ? " ff-readiness-intro" : ""}`} data-quiz-id="care-readiness" data-care-step={!started ? "intro" : isResult ? "result" : section?.id ?? "species"}>
    <header className={`ff-readiness-appbar${!started ? " ff-readiness-intro-appbar" : ""}`}>
      <button type="button" className="ff-readiness-back" onClick={previous} aria-label="이전으로"><IconChevronLeftLine aria-hidden /></button>
      <strong>입양 환경 점검</strong>
      <div className="ff-readiness-header-actions"><button type="button" className="ff-readiness-home" onClick={() => window.location.assign("/")} aria-label="홈으로 이동"><IconHouseLine aria-hidden /></button></div>
    </header>
    {started && <div className="ff-readiness-progress" role="progressbar" aria-label="생활 점검 진행률" aria-valuemin={1} aria-valuemax={totalSteps} aria-valuenow={isResult ? totalSteps : step + 1}><div style={{ width: `${(Math.min(step + 1, totalSteps) / totalSteps) * 100}%` }} /></div>}
    {!started ? <section className="ff-readiness-intro-content" aria-labelledby="care-readiness-intro-title">
      <div className="ff-readiness-intro-badge">입양 환경 점검</div><h1 id="care-readiness-intro-title">반려동물과<br />함께할 준비를 살펴봐요</h1>
      <p className="ff-care-helper">7개 영역에서 준비된 부분과 앞으로 챙길 일을 확인해요.</p>
      {admin && <ActionButton size="small" variant="neutralWeak" onClick={preview}>관리자 · 결과 화면 미리보기</ActionButton>}
    </section> : isResult ? <section className="ff-care-result" aria-labelledby="care-result-title">
      <h1 id="care-result-title" className="ff-care-result-complete">🎉 함께할 준비를 모두 알아봤어요!</h1>
      <CertificateResult ref={certRef} preview={isPreview} toneOverride={tone} onShare={() => certRef.current?.share(new URL("/quiz/care-readiness", window.location.origin).toString()) ?? Promise.resolve()} badge="입양 환경 점검 확인서" quiz="care-readiness" illustration={tone !== "bronze" ? "/readiness-result.webp" : "/readiness-result-failed.webp"} memberName={memberName} rows={[{ label: "함께할 준비", value: `${score}%` }, { label: "항목", value: `${result.readyCount}/${result.total}` }, { label: "등급", value: title }]} share={{ title: "퍼스트프렌드 입양 환경 점검", text: message }} />
      <Accordion className="ff-care-result-accordion" multiple>
        {result.sections.map(s => <AccordionItem value={s.id} key={s.id}>
          <AccordionTrigger title={<span className="ff-care-result-item-title"><span>{s.label}</span><span className={`ff-care-result-item-score ${s.status === "ready" ? "is-ready" : "is-check"}`}>{careStatus[s.status]}</span></span>} />
          <AccordionContent>
            <ul className="ff-care-answer-list">{s.questions.map(q => <li key={q.id}><span>{q.action}</span><strong>{careAnswerScore[answers[q.id] ?? "unchecked"]}</strong></li>)}</ul>
            {s.questions.some(q => answers[q.id] !== "ready" && answers[q.id] !== "na") && <div className="ff-care-next-steps"><strong>다음으로 준비할 일</strong><ul>{result.pending.filter(q => s.questions.some(item => item.id === q.id)).map(q => <li key={q.id}>{q.action}</li>)}</ul></div>}
          </AccordionContent>
        </AccordionItem>)}
      </Accordion>
      <details className="ff-care-scoring"><summary>준비 진행도는 어떻게 계산하나요?</summary><p>세부 항목은 준비 완료 100점, 준비 중 50점, 미확인 0점이에요. 영역 점수가 70점 이상이고 해당 영역의 필수 항목을 모두 완료하면 준비됐어요로 표시해요.</p><p>전체 준비도에는 영역별 배점을 적용해요. 해당 없는 질문은 제외하고 같은 영역 안에서 배점을 나눠요.</p><ul>{sections.map(s => <li key={s.id}>{s.label} · {s.weight}점</li>)}</ul><p>금메달은 90점 이상, 은메달은 70점 이상 90점 미만이에요. 70점 미만은 동메달이에요. 필수 항목이 준비 중이거나 확인이 필요하면 점수는 유지하고 동메달로 표시해요. 항목 수는 해당 질문 중 준비를 마친 수예요.</p></details>
      <p className="ff-care-result-note">이 결과는 입양 가능 여부를 판단하지 않아요. 스스로 답한 내용을 바탕으로 준비 진행도를 보여줘요. 보호소 상담과 실제 생활 조건을 함께 확인해 주세요.</p>
    </section> : <section className="ff-care-step" aria-labelledby="care-step-title">
      <p className="ff-care-step-count">{step + 1}/{totalSteps}</p>
      {step === 0 ? <><h1 id="care-step-title">어떤 친구와 함께하고 싶나요?</h1><div className="ff-care-choice-grid">{(["cat", "dog"] as const).map(value => <button type="button" className="ff-care-species-choice" aria-pressed={species === value} data-selected={species === value || undefined} key={value} onClick={() => setSpecies(value)}><Image src={`/${value}-selection.webp`} alt="" width={104} height={104} unoptimized /><strong>{value === "cat" ? "고양이" : "강아지"}</strong></button>)}</div><p className="ff-care-helper">친구에게 맞는 돌봄과 생활 준비를 살펴볼게요.</p></> : section && <><h1 id="care-step-title">{section.label}</h1><p className="ff-care-helper">마친 준비와 앞으로 할 일을 나눠 답해 주세요.</p>
        <div className="ff-care-question-list">{section.questions.map(q => <RadioGroup key={q.id} label={q.label} value={answers[q.id] ?? ""} onValueChange={value => setAnswers(current => ({ ...current, [q.id]: value as CareAnswer }))}>
          {(["ready", "planning", "unchecked"] as const).map((value, index) => <RadioGroupItem key={value} className="ff-care-answer-card" value={value} label={q.options[index]} />)}
          {q.blocked && <RadioGroupItem className="ff-care-answer-card" value="blocked" label={q.blocked.label} />}
          {q.na && <RadioGroupItem className="ff-care-answer-card" value="na" label={q.na} />}
        </RadioGroup>)}</div>
      </>}
    </section>}
    <div className={`ff-readiness-actions ${isResult ? "is-result" : "is-single"}`}>
      {!started ? <ActionButton size="large" variant="brandSolid" className="ff-grow" onClick={() => setStarted(true)}>시작하기</ActionButton> : isResult ? <><ActionButton size="large" variant="neutralWeak" className="ff-grow" onClick={() => void certRef.current?.save()}><IconArrowDownLine aria-hidden />확인서 저장</ActionButton><ActionButton size="large" variant="brandSolid" className="ff-grow" onClick={retry}><IconArrowClockwiseCircularLine aria-hidden />다시 하기</ActionButton></> : <ActionButton size="large" variant="brandSolid" className="ff-grow" disabled={!canContinue} onClick={() => { if (canContinue) setStep(value => value + 1); }}>{step === totalSteps - 1 ? "결과 보기" : "다음"}</ActionButton>}
    </div>
  </div>;
}
