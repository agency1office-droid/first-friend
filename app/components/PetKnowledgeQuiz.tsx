"use client";

import { useMemo, useState } from "react";
import { ActionButton } from "seed-design/ui/action-button";
import { IconCheckmarkCircleFill, IconChevronLeftLine, IconXmarkCircleFill } from "@karrotmarket/react-monochrome-icon";

type Species = "cat" | "dog";
type Answer = "yes" | "no";
type QuizQuestion = { statement: string; answer: Answer; explanation: string };

const questions: Record<Species, QuizQuestion[]> = {
  cat: [
    { statement: "입양 첫날에는 조용한 적응 공간을 먼저 준비해야 해요.", answer: "yes", explanation: "낯선 환경에 익숙해질 수 있도록 처음에는 작고 조용한 공간을 마련해 주세요." },
    { statement: "고양이를 키울 때는 매달 사료와 모래 비용이 들어가요.", answer: "yes", explanation: "사료와 간식뿐 아니라 모래, 용품 교체 비용도 생활비에 포함해 생각해 주세요." },
    { statement: "고양이는 높은 곳에 있어도 창문과 방묘시설을 확인하지 않아도 돼요.", answer: "no", explanation: "창문과 방충망, 방묘시설을 미리 확인해 추락과 탈출을 예방해 주세요." },
    { statement: "예방접종과 중성화에 필요한 비용은 입양 전에 확인하는 게 좋아요.", answer: "yes", explanation: "동물병원과 나이에 따라 달라질 수 있으니 예상 비용과 일정을 상담해 주세요." },
    { statement: "고양이와 함께할 시간과 평생 돌봄 계획은 미리 생각하지 않아도 돼요.", answer: "no", explanation: "평균 수명과 생활 환경, 가족의 돌봄 계획을 함께 살펴보는 게 좋아요." },
  ],
  dog: [
    { statement: "입양 첫날에는 조용한 적응 공간을 먼저 준비해야 해요.", answer: "yes", explanation: "낯선 환경에 익숙해질 수 있도록 처음에는 작고 조용한 공간을 마련해 주세요." },
    { statement: "강아지를 키울 때는 매달 사료와 배변패드 비용이 들어가요.", answer: "yes", explanation: "사료와 간식뿐 아니라 배변패드, 산책용품 교체 비용도 생활비에 포함해 생각해 주세요." },
    { statement: "강아지는 짧은 산책이라도 안전장비 없이 나가도 괜찮아요.", answer: "no", explanation: "몸에 맞는 하네스나 목줄, 인식표를 준비하고 산책 환경을 확인해 주세요." },
    { statement: "예방접종과 중성화에 필요한 비용은 입양 전에 확인하는 게 좋아요.", answer: "yes", explanation: "동물병원과 나이에 따라 달라질 수 있으니 예상 비용과 일정을 상담해 주세요." },
    { statement: "강아지와 함께할 시간과 평생 돌봄 계획은 미리 생각하지 않아도 돼요.", answer: "no", explanation: "평균 수명과 산책 시간, 가족의 돌봄 계획을 함께 살펴보는 게 좋아요." },
  ],
};

export function PetKnowledgeQuiz({ species, onClose }: { species: string; onClose: () => void }) {
  const selectedSpecies: Species = species.includes("고양이") ? "cat" : "dog";
  const quiz = useMemo(() => questions[selectedSpecies], [selectedSpecies]);
  const [step, setStep] = useState(0);
  const [selected, setSelected] = useState<Answer | null>(null);
  const [answers, setAnswers] = useState<Record<number, Answer>>({});
  const question = quiz[step];
  const complete = step >= quiz.length;
  const score = quiz.reduce((total, item, index) => total + (answers[index] === item.answer ? 1 : 0), 0);

  function submit() {
    if (!selected) return;
    setAnswers((current) => ({ ...current, [step]: selected }));
    setSelected(null);
    setStep((current) => current + 1);
  }

  return <div className="ff-pet-knowledge-page" role="dialog" aria-modal="true" aria-labelledby="pet-knowledge-title">
    <header className="ff-pet-knowledge-header">
      <button type="button" onClick={onClose} aria-label="퀴즈 닫기"><IconChevronLeftLine aria-hidden /></button>
      <strong id="pet-knowledge-title">반려동물 상식 퀴즈</strong>
    </header>

    <main className="ff-pet-knowledge-main">
      <section className="ff-pet-knowledge-progress-card" aria-label="퀴즈 진행 상황">
        <div className="ff-pet-knowledge-progress-head"><strong>입양 전 상식 확인</strong><span>정답 {score}개</span></div>
        <div className="ff-pet-knowledge-progress-track">{quiz.map((item, index) => {
          const answered = answers[index] !== undefined;
          const correct = answers[index] === item.answer;
          return <span key={index} className={`ff-pet-knowledge-step${index === step && !complete ? " is-current" : ""}${answered && correct ? " is-correct" : ""}${answered && !correct ? " is-muted" : ""}`}><i>{answered && correct ? <IconCheckmarkCircleFill aria-hidden /> : answered && !correct ? <IconXmarkCircleFill aria-hidden /> : index + 1}</i><small>{index + 1}단계</small></span>;
        })}</div>
      </section>

      {complete ? <section className="ff-pet-knowledge-result" role="status"><div className="ff-pet-knowledge-result-icon"><IconCheckmarkCircleFill aria-hidden /></div><h1>{quiz.length}문제를 모두 확인했어요</h1><p>맞힌 문제는 {score}개예요. 틀린 문제도 다시 살펴보며 입양 준비를 이어가 보세요.</p><ActionButton size="large" onClick={onClose}>닫기</ActionButton></section> : <section className="ff-pet-knowledge-question" aria-labelledby="pet-knowledge-question-title"><div className="ff-pet-knowledge-question-number">Q{step + 1}</div><h1 id="pet-knowledge-question-title">{question.statement}</h1><div className="ff-pet-knowledge-options"><button type="button" className={selected === "yes" ? "is-selected" : ""} onClick={() => setSelected("yes")}><span>예</span>{selected === "yes" && <IconCheckmarkCircleFill aria-hidden />}</button><button type="button" className={selected === "no" ? "is-selected" : ""} onClick={() => setSelected("no")}><span>아니오</span>{selected === "no" && <IconXmarkCircleFill aria-hidden />}</button></div><p className="ff-pet-knowledge-explanation">{question.explanation}</p></section>}
    </main>

    {!complete && <footer className="ff-pet-knowledge-actions"><ActionButton size="large" disabled={!selected} onClick={submit}>선택했어요</ActionButton></footer>}
  </div>;
}
