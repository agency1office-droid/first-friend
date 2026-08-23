"use client";

import { useEffect, useMemo, useState } from "react";
import Image from "next/image";
import { ActionButton } from "seed-design/ui/action-button";
import { IconChevronLeftLine, IconHouseLine, IconPawprintFill, IconXmarkLine } from "@karrotmarket/react-monochrome-icon";
import { educationScore as calculateEducation } from "../../lib/readiness-score";
import { createReadinessSharePath } from "../../lib/readiness-share";
import { getQuizDefinition } from "../../lib/quiz/registry";
import type { QuizQuestion } from "../../lib/quiz/types";

type Species = "cat" | "dog";
type PreviewResult = "success" | "failure" | "";
type Profile = { homeAllowed: string; homeType: string; household: string; absence: number; careMinutes: number; safety: string; currentPets: string; longAbsence: string; experience: string };
type Question = QuizQuestion;

const initialProfile: Profile = { homeAllowed: "yes", homeType: "apartment", household: "yes", absence: 6, careMinutes: 60, safety: "ready", currentPets: "none", longAbsence: "ready", experience: "first" };

const commonChapters: Question[] = [
  { chapter: "보호소에 연락하기", question: "관심 있는 친구를 발견했다면 보호소에 무엇부터 물어볼까요?", options: ["아직 입양 가능한지, 방문 상담 예약이 필요한지 물어봐요", "사진이 마음에 들면 연락 없이 바로 찾아가요", "예약 없이 언제든 방문해요"], answer: 0, explanation: "공고가 올라와 있어도 상담 중이거나 입양 절차가 진행 중일 수 있어요. 방문 전에 보호소에 현재 상황을 확인해 주세요." },
  { chapter: "보호소에 연락하기", question: "방문 전에 보호소에서 확인하면 좋은 정보는 무엇인가요?", options: ["이름과 나이만 확인해요", "건강·치료 기록, 먹는 사료, 배변 습관과 사람·동물에 대한 반응을 물어봐요", "사진에 나온 모습만 보고 판단해요"], answer: 1, explanation: "집에서 바로 이어갈 돌봄을 준비하려면 치료 기록과 생활 습관, 주의할 점을 구체적으로 물어보는 게 좋아요." },
  { chapter: "입양 절차와 이동", question: "보호소에 방문하기 전에 무엇을 준비해야 할까요?", options: ["필요한 신분증·서류, 입양 조건과 비용을 보호소에 확인해요", "준비할 것은 없으니 현장에서 정해요", "입양한 뒤에 필요한 내용을 알아봐요"], answer: 0, explanation: "보호소마다 상담·계약 절차와 필요한 서류가 달라요. 방문 전에 준비물과 비용, 입양 후 안내를 확인해 주세요." },
  { chapter: "입양 절차와 이동", question: "보호소에서 집까지 어떻게 데려오는 게 안전할까요?", options: ["안고 이동해요", "차 안에 잠깐 풀어둬요", "문이 잠기는 이동장이나 차량용 안전장비를 사용해요"], answer: 2, explanation: "차 문이나 현관이 열릴 때 뛰쳐나갈 수 있어요. 고양이는 이동장, 강아지는 이동장이나 차량용 안전장비를 준비해 주세요." },
  { chapter: "처음 맞이할 준비", question: "입양 첫날 집에 미리 준비해 둘 것은 무엇인가요?", options: ["집 전체를 바로 구경시켜요", "조용히 쉴 공간, 물, 사료와 화장실을 먼저 준비해요", "친구들을 불러 함께 환영해요"], answer: 1, explanation: "처음에는 한 공간에서 물과 먹을 것, 화장실을 쉽게 찾을 수 있게 준비하고 집에 익숙해질 시간을 주세요." },
  { chapter: "처음 맞이할 준비", question: "반려동물이 구석에 숨으면 어떻게 해야 할까요?", options: ["계속 안아 주며 익숙하게 해요", "숨으면 바로 꺼내요", "억지로 꺼내지 않고 스스로 나올 때까지 조용히 기다려요"], answer: 2, explanation: "숨는 행동은 낯선 환경에서 긴장했다는 신호일 수 있어요. 숨을 곳과 휴식 시간을 주면서 천천히 적응하도록 도와주세요." },
  { chapter: "매일 함께할 시간", question: "입양 전에 누가 어떤 돌봄을 맡을지 어떻게 정하면 좋을까요?", options: ["급여·배변·산책·청소를 가족의 생활표에 맞춰 미리 정해요", "주말에만 충분히 돌보면 돼요", "가족 중 누군가가 알아서 돌볼 거예요"], answer: 0, explanation: "먹이 주기, 배변·청소, 산책이나 놀이를 누가 언제 맡을지 정해 두면 돌봄이 한 사람에게 몰리지 않아요." },
  { chapter: "매일 함께할 시간", question: "집을 오래 비우거나 여행을 가야 할 때는 어떻게 할까요?", options: ["그날 상황을 보고 결정해요", "가족·지인·돌봄 서비스 중 맡길 방법과 비상 연락처를 미리 정해요", "물과 사료를 많이 두면 괜찮아요"], answer: 1, explanation: "돌봄을 맡길 사람, 이용할 병원, 보호소 연락처를 미리 적어 두면 갑작스러운 부재에도 대응하기 쉬워요." },
  { chapter: "건강과 안전", question: "고양이 또는 강아지에게 필요한 안전 준비는 무엇인가요?", options: ["고양이는 방묘창·방묘문, 강아지는 하네스·리드줄·인식표를 준비해요", "높은 곳이나 현관은 조심하지 않아도 돼요", "짧은 줄 하나면 모든 안전 준비가 끝나요"], answer: 0, explanation: "고양이는 추락·탈출을, 강아지는 산책 중 이탈을 예방할 수 있도록 동물에 맞는 안전장비를 준비해 주세요." },
  { chapter: "건강과 안전", question: "반려동물이 평소와 다르게 먹지 않거나 처져 보이면 어떻게 할까요?", options: ["며칠 더 지켜봐요", "사람 약이나 남은 약을 먼저 먹여요", "보호소에 알리고 동물병원에 상담해요"], answer: 2, explanation: "먹는 양과 활력의 변화는 원인이 다양해요. 임의로 약을 먹이지 말고 보호소와 동물병원에 상황을 알려 확인해 주세요." },
  { chapter: "비용과 생활 계획", question: "입양 전 비용 계획에는 무엇을 함께 넣어야 할까요?", options: ["처음 필요한 용품만 준비하면 충분해요", "사료·간식·배변용품과 예방접종·중성화·예상 밖 진료비를 함께 계산해요", "아픈 일이 생기면 그때 가족에게 부탁해요"], answer: 1, explanation: "처음 드는 비용과 매달 반복되는 비용, 갑작스러운 진료비를 나눠 생각해 보면 내 생활에 맞는지 확인하기 쉬워요." },
  { chapter: "평생 함께할 책임", question: "입양 전에 집과 가족에 대해 확인할 것은 무엇인가요?", options: ["가족 모두의 동의, 주거 규정과 알레르기 여부를 확인해요", "입양한 뒤 가족이 적응하면 돼요", "돌봄은 한 사람만 맡으면 충분해요"], answer: 0, explanation: "동거인의 동의, 집주인·관리규약의 반려동물 허용 여부, 알레르기와 기존 반려동물을 미리 확인해 주세요." },
  { chapter: "평생 함께할 책임", question: "입양할 때 동물등록 정보는 어떻게 확인해야 할까요?", options: ["보호소에 등록 여부와 보호자 변경 절차를 확인해요", "목걸이가 있으면 따로 확인하지 않아도 돼요", "몇 년 함께 산 뒤에 생각해요"], answer: 0, explanation: "이미 등록된 친구라면 보호자 정보가 제대로 변경됐는지 확인해 주세요. 등록 방법과 적용 여부는 동물 종류와 지역에 따라 다를 수 있어요." },
  { chapter: "평생 함께할 책임", question: "더 이상 돌보기 어려운 상황이 생기면 어떻게 해야 할까요?", options: ["몰래 다른 사람에게 보내요", "밖에 풀어줘요", "문제가 커지기 전에 보호소·동물병원·전문기관에 상담해요"], answer: 2, explanation: "이사·질병·경제적 어려움이 생기면 혼자 결정하지 말고 일찍 상담해 안전한 방법을 찾아야 해요." },
  { chapter: "가족으로 맞이하기", question: "반려동물을 가족으로 맞이한다는 것은 무엇을 의미할까요?", options: ["외로울 때만 함께하고 상황이 바뀌면 쉽게 보내요", "말을 잘 들을 때만 가족처럼 대해요", "생활이 바뀌어도 시간·비용·돌봄을 함께 책임질 계획을 세워요"], answer: 2, explanation: "반려동물은 필요할 때만 함께하는 대상이 아니에요. 내 생활이 바뀌어도 끝까지 돌볼 방법을 미리 생각해 주세요." },
  { chapter: "가족으로 맞이하기", question: "보호소에서 지내던 친구를 처음 만날 때 어떤 태도가 필요할까요?", options: ["과거와 성격을 미리 단정하지 않고 반응을 살피며 천천히 다가가요", "빨리 친해지도록 계속 만지고 안아줘요", "처음 보인 반응만으로 순하거나 예민하다고 판단해요"], answer: 0, explanation: "보호소 동물의 과거 경험과 현재 마음을 모두 알 수는 없어요. 낯선 장소에서 긴장할 수 있으니 반응을 존중하며 적응할 시간을 주세요." },
  { chapter: "가족으로 맞이하기", question: "분양 비용이 없거나 적으면 가벼운 마음으로 시작해도 될까요?", options: ["네, 시작 비용이 적으니 부담도 적어요", "아니요. 분양 방식과 관계없이 평생 생활비·진료비·돌봄 책임을 준비해야 해요", "처음에는 데려온 뒤 필요한 것만 생각해요"], answer: 1, explanation: "무료 분양이어도 사료·배변용품·예방 관리·진료비는 계속 필요해요. 비용과 돌봄 계획을 세운 뒤 결정해 주세요." },
];

const speciesSafety: Record<Species, Question["options"]> = {
  cat: ["튼튼한 방묘창·방묘문을 설치해요", "창문을 조금만 열어둬요", "높은 층이면 괜찮아요"],
  dog: ["몸에 맞는 하네스·리드줄·인식표를 확인해요", "목줄 없이 자유롭게 걸어요", "짧은 줄이면 충분해요"],
};

export function ReadinessQuiz({ onClose, quizId = "adoption-prep" }: { onClose?: () => void; quizId?: string }) {
  const quizDefinition = getQuizDefinition(quizId);
  const [phase, setPhase] = useState<"intro" | "species" | "questions" | "result">("intro");
  const [step, setStep] = useState(0);
  const [species, setSpecies] = useState<Species | null>(null);
  const profile = initialProfile;
  const [answers, setAnswers] = useState<Record<number, number>>({});
  const [firstAnswers, setFirstAnswers] = useState<Record<number, number>>({});
  const [pendingAnswer, setPendingAnswer] = useState<number | null>(null);
  const [feedbackAnswer, setFeedbackAnswer] = useState<number | null>(null);
  const [retryAnswerHintsVisible, setRetryAnswerHintsVisible] = useState(false);
  const [revealedAnswer, setRevealedAnswer] = useState<number | null>(null);
  const [showResult, setShowResult] = useState(false);
  const [previewResult, setPreviewResult] = useState<PreviewResult>("");
  useEffect(() => {
    const scroller = document.querySelector<HTMLElement>(".ff-quiz-shell .ff-readiness > section");
    if (scroller) scroller.scrollTop = 0;
    else window.scrollTo(0, 0);
  }, [phase, step, feedbackAnswer, retryAnswerHintsVisible, revealedAnswer]);
  const selectedSpecies = species ?? "cat";
  const questions = useMemo(() => {
    if (quizDefinition?.questions) return quizDefinition.questions;
    return commonChapters.map((question, index) => index === 8 ? { ...question, question: selectedSpecies === "cat" ? "고양이에게 필요한 안전 준비는 무엇인가요?" : "강아지에게 필요한 안전 준비는 무엇인가요?", options: speciesSafety[selectedSpecies], answer: 0, explanation: selectedSpecies === "cat" ? "추락과 탈출은 짧은 순간에 일어날 수 있어요. 고정된 방묘 장치를 준비해 주세요." : "낯선 환경에서의 이탈을 막을 수 있도록 몸에 맞는 안전장비와 인식표를 준비해 주세요." } : question);
  }, [quizDefinition, selectedSpecies]);
  // Retry answers in `answers` must override the original attempt in `firstAnswers`.
  // `firstAnswers` is retained for the retry hint flow, while scoring and saving use
  // the latest answer submitted for each question.
  const submittedAnswers = questions.map((_, index) => answers[index] ?? firstAnswers[index]);
  const correctCount = submittedAnswers.filter((answer, index) => answer === questions[index].answer).length;
  const passingCount = Math.ceil(questions.length * 0.8);
  // Each quiz definition owns its question set. Do not route the result through
  // the legacy readiness score, which only knows the old readiness answer sets.
  // This keeps a 15/15 knowledge result from being treated as a failed result.
  const passed = correctCount >= passingCount;
  const certificatePraise = useMemo(() => {
    if (quizDefinition?.slug === "care-readiness") {
      if (correctCount === questions.length) return { title: "함께할 준비가 잘 되어 있어요", description: "시간·공간·비용을 현실적으로 살펴봤어요. 보호소 상담에서 우리 생활에 맞는 부분도 함께 확인해 보세요." };
      if (correctCount >= passingCount) return { title: "조금 더 확인해 보면 좋아요", description: "함께하기 전에 몇 가지 조건을 더 살펴보면 생활을 준비하는 데 도움이 될 거예요." };
      return { title: "아직 확인할 내용이 있어요", description: "시간·공간·비용을 한 번 더 점검한 뒤 입양을 결정해 주세요." };
    }
    if (quizDefinition?.slug === "pet-knowledge") {
      if (correctCount === questions.length) return { title: "최고의 반려인", description: "반려동물의 하루와 마음을 정말 잘 이해하고 있어요. 이제 함께하는 일상을 더 즐겁게 만들어 가면 돼요." };
      if (correctCount >= passingCount) return { title: "든든한 반려인", description: "함께 살아가는 데 필요한 내용을 잘 확인했어요. 몇 가지를 더 알아두면 함께하는 생활이 한층 편해질 거예요." };
      return { title: "배워가는 반려인", description: "함께 지내며 알아두면 좋은 내용이 조금 남아 있어요. 틀린 문제를 다시 살펴보면 함께하는 생활에 도움이 될 거예요." };
    }
    if (correctCount === questions.length) return { title: "완벽한 반려인", description: "모든 문제를 맞히다니, 정말 잘 해냈어요. 이 결과는 마음껏 자랑해도 좋아요." };
    if (correctCount >= questions.length - 1) return { title: "든든한 반려인", description: "입양 전에 필요한 내용을 거의 모두 확인했어요. 반려동물 친구를 맞이할 준비가 든든해지고 있어요." };
    if (correctCount >= passingCount + 1) return { title: "세심한 반려인", description: "반려동물 친구와 함께하기 전에 알아야 할 내용을 잘 확인했어요. 남은 내용도 살펴보면 더 든든해질 거예요." };
    if (correctCount >= passingCount) return { title: "따뜻한 반려인", description: "입양 전에 필요한 기본 내용을 확인했어요. 보호소 상담에서 남은 내용도 함께 살펴보면 좋아요." };
    return { title: "배워가는 반려인", description: "반려동물 친구를 맞이하기 전에 몇 가지 내용을 더 확인해 보면 좋아요. 틀린 문제를 다시 살펴보며 천천히 준비해 보세요." };
  }, [correctCount, passingCount, questions.length, quizDefinition?.slug]);
  async function saveResult(answerValues = submittedAnswers) {
    try {
      const response = await fetch("/api/readiness", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ species: selectedSpecies, profile, answers: answerValues }) });
      if (!response.ok) console.warn("readiness_save_failed", response.status);
    } catch (error) {
      console.warn("readiness_save_failed", error);
    }
  }
  async function shareCertificate() {
    const shareUrl = new URL(createReadinessSharePath(correctCount, questions.length), window.location.origin).toString();
    const shareData = { title: `퍼스트프렌드 ${certificatePraise.title}`, text: `${questions.length}문제 중 ${correctCount}문제 정답이에요. 입양 전 준비 확인을 마쳤어요.`, url: shareUrl };
    try {
      if (navigator.share) await navigator.share(shareData);
      else await navigator.clipboard.writeText(`${shareData.text} ${shareData.url}`);
    } catch (error) {
      if ((error as DOMException).name !== "AbortError") return;
    }
  }
  async function next() {
    if (phase === "intro") { setSpecies(null); setAnswers({}); setFirstAnswers({}); setFeedbackAnswer(null); setRetryAnswerHintsVisible(false); setStep(0); setPhase(quizDefinition?.showSpeciesSelection === false ? "questions" : "species"); return; }
    if (phase === "species") { setRetryAnswerHintsVisible(false); setPhase("questions"); setStep(0); return; }
    if (phase === "questions") {
      if (revealedAnswer !== null) {
        setRevealedAnswer(null);
        if (step < questions.length - 1) { setStep((current) => current + 1); return; }
        setPhase("result");
        setShowResult(true);
        return;
      }
      if (answers[step] !== undefined || feedbackAnswer !== null) return;
      if (pendingAnswer === null) return;
      const answer = pendingAnswer;
      setPendingAnswer(null);
      const nextFirstAnswers = firstAnswers[step] === undefined ? { ...firstAnswers, [step]: answer } : firstAnswers;
      if (firstAnswers[step] === undefined) setFirstAnswers(nextFirstAnswers);
      if (answer !== question.answer) { setFeedbackAnswer(answer); return; }
      const nextAnswers = { ...answers, [step]: answer };
      setAnswers(nextAnswers);
      if (step < questions.length - 1) { setStep((current) => current + 1); return; }
      setPhase("result");
      setShowResult(true);
      const nextSubmittedAnswers = questions.map((_, index) => nextAnswers[index] ?? nextFirstAnswers[index]);
      if (quizDefinition?.persistResult !== false && calculateEducation(nextSubmittedAnswers) >= 80) await saveResult(nextSubmittedAnswers);
      return;
    }
    setPhase("result");
    setShowResult(true);
    if (quizDefinition?.persistResult !== false && passed) await saveResult();
  }
  function previous() {
    if (phase === "result") { setRetryAnswerHintsVisible(false); setRevealedAnswer(null); setPhase("questions"); setShowResult(false); setStep(questions.length - 1); return; }
    if (phase === "questions" && feedbackAnswer !== null) { setFeedbackAnswer(null); setPendingAnswer(null); setRetryAnswerHintsVisible(false); setRevealedAnswer(null); return; }
    if (phase === "questions" && revealedAnswer !== null) { setRevealedAnswer(null); return; }
    if (phase === "questions" && answers[step] !== undefined) { setAnswers((current) => { const nextAnswers = { ...current }; delete nextAnswers[step]; return nextAnswers; }); setPendingAnswer(null); setRetryAnswerHintsVisible(false); setRevealedAnswer(null); return; }
    if (phase === "questions" && step > 0) { setAnswers((current) => { const nextAnswers = { ...current }; delete nextAnswers[step - 1]; return nextAnswers; }); setStep((current) => current - 1); setPendingAnswer(null); setFeedbackAnswer(null); setRetryAnswerHintsVisible(false); setRevealedAnswer(null); return; }
    if (phase === "questions") { setRetryAnswerHintsVisible(false); setRevealedAnswer(null); setPhase(hasSpeciesPage ? "species" : "intro"); return; }
    setPhase("intro");
    setPendingAnswer(null);
    setFeedbackAnswer(null);
    setRetryAnswerHintsVisible(false);
    setRevealedAnswer(null);
  }
  async function skipFeedback() {
    setFeedbackAnswer(null);
    setPendingAnswer(null);
    setRetryAnswerHintsVisible(false);
    setRevealedAnswer(null);
    if (step < questions.length - 1) {
      setStep((current) => current + 1);
      return;
    }
    setPhase("result");
    setShowResult(true);
    const finalAnswers = questions.map((_, index) => answers[index] ?? firstAnswers[index]);
    if (quizDefinition?.persistResult !== false && calculateEducation(finalAnswers) >= 80) await saveResult(finalAnswers);
  }
  function restartQuiz() {
    setPhase("questions");
    setStep(0);
    setAnswers({});
    setFirstAnswers({});
    setPendingAnswer(null);
    setFeedbackAnswer(null);
    setRetryAnswerHintsVisible(true);
    setRevealedAnswer(null);
    setShowResult(false);
  }
  function preview(value: PreviewResult) {
    if (!value) { resetQuiz(); return; }
    const previewAnswers = questions.reduce<Record<number, number>>((result, currentQuestion, index) => {
      result[index] = value === "success" ? currentQuestion.answer : (currentQuestion.answer + 1) % currentQuestion.options.length;
      return result;
    }, {});
    setPreviewResult(value);
    setSpecies("cat");
    setAnswers(previewAnswers);
    setFirstAnswers(previewAnswers);
    setPendingAnswer(null);
    setFeedbackAnswer(null);
    setRetryAnswerHintsVisible(false);
    setRevealedAnswer(null);
    setStep(questions.length - 1);
    setPhase("result");
    setShowResult(true);
  }

  const questionIndex = step;
  const question = questions[questionIndex];
  const selectedAnswer = feedbackAnswer ?? answers[questionIndex];
  const hasAnswered = feedbackAnswer !== null;
  const hasSpeciesPage = quizDefinition?.showSpeciesSelection !== false;
  const totalPages = questions.length + (hasSpeciesPage ? 1 : 0);
  const pageNumber = phase === "species" ? 1 : phase === "questions" ? step + (hasSpeciesPage ? 2 : 1) : totalPages;
  const progressPercent = phase === "intro" ? 0 : Math.round((pageNumber / totalPages) * 100);
  const isProgressPage = phase === "species" || phase === "questions";
  function resetQuiz() {
    setPhase("intro");
    setStep(0);
    setSpecies(null);
    setAnswers({});
    setFirstAnswers({});
    setFeedbackAnswer(null);
    setRetryAnswerHintsVisible(false);
    setRevealedAnswer(null);
    setPreviewResult("");
    setShowResult(false);
  }
  const previewEnabled = process.env.NODE_ENV !== "production";
  function closeQuiz() {
    if (onClose) {
      onClose();
      return;
    }
    const returnTo = new URLSearchParams(window.location.search).get("return_to");
    if (returnTo && returnTo.startsWith("/friends/") && !returnTo.startsWith("//")) {
      window.location.assign(returnTo);
      return;
    }
    const detailReferrer = (() => {
      try {
        const referrer = new URL(document.referrer);
        if (referrer.origin !== window.location.origin || !referrer.pathname.startsWith("/friends/")) return "";
        return `${referrer.pathname}${referrer.search}${referrer.hash}`;
      } catch {
        return "";
      }
    })();
    if (detailReferrer) {
      window.location.assign(detailReferrer);
      return;
    }
    window.location.replace("/");
  }
  function renderFooter() {
    if (phase === "result") {
      return passed && quizDefinition?.shareable !== false ? <><ActionButton key="result-close-passed" size="large" variant="neutralWeak" className="ff-grow" onClick={closeQuiz}>닫기</ActionButton><ActionButton key="result-share" size="large" variant="brandSolid" className="ff-grow" onClick={shareCertificate}>공유하기</ActionButton></> : <><ActionButton key="result-close" size="large" variant="neutralWeak" className="ff-grow" onClick={closeQuiz}>닫기</ActionButton><ActionButton key="result-retry" size="large" variant="brandSolid" className="ff-grow" onClick={restartQuiz}>다시 풀기</ActionButton></>;
    }
    if (phase === "intro") {
      return <ActionButton key="intro-start" size="large" className="ff-grow" onClick={next}>시작하기</ActionButton>;
    }
    if (phase === "species") {
      return <ActionButton key={`species-next-${species === null ? "disabled" : "enabled"}`} size="large" variant="brandSolid" className="ff-grow" disabled={species === null} onClick={next}>다음</ActionButton>;
    }
    if (feedbackAnswer !== null) {
      return <><ActionButton key="feedback-skip" size="large" variant="neutralWeak" className="ff-grow" onClick={skipFeedback}>넘어가기</ActionButton><ActionButton key="feedback-retry" size="large" variant="brandSolid" className="ff-grow" onClick={previous}>다시 풀기</ActionButton></>;
    }
    if (revealedAnswer !== null) {
      return <ActionButton key="revealed-next" size="large" variant="brandSolid" className="ff-grow" onClick={next}>다음</ActionButton>;
    }
    if (hasAnswered) {
      return <ActionButton key="answered-previous" size="large" variant="brandSolid" className="ff-grow" onClick={previous}>이전</ActionButton>;
    }
    return <ActionButton key={`question-next-${pendingAnswer === null ? "disabled" : "enabled"}`} size="large" variant="brandSolid" className="ff-grow" disabled={pendingAnswer === null} onClick={next}>다음</ActionButton>;
  }
  return <div className={`ff-readiness ff-readiness-${phase}`} data-quiz-id={quizDefinition?.slug ?? "adoption-prep"}>
    <header className={`ff-readiness-appbar${phase === "intro" ? " ff-readiness-intro-appbar" : ""}`}>
      <button type="button" className="ff-readiness-back" onClick={phase === "intro" ? closeQuiz : previous} aria-label="이전으로"><IconChevronLeftLine aria-hidden /></button>
      <strong>{quizDefinition?.title ?? "입양 전 준비 확인"}</strong>
      <div className="ff-readiness-header-actions"><button type="button" className="ff-readiness-home" onClick={() => window.location.assign("/")} aria-label="홈으로 이동"><IconHouseLine aria-hidden /></button></div>
    </header>
    {isProgressPage && <div className="ff-readiness-progress" role="progressbar" aria-label="입양 전 준비 진행률" aria-valuemin={1} aria-valuemax={totalPages} aria-valuenow={pageNumber}><div style={{ width: `${progressPercent}%` }} /></div>}

    {phase === "intro" && <section className="ff-readiness-intro-content" aria-labelledby="readiness-intro-title"><div className="ff-readiness-intro-badge">{quizDefinition?.intro.badge ?? "준비 가이드"}</div><h1 id="readiness-intro-title">{quizDefinition?.intro.title ?? "반려동물과\n함께할 준비하기"}</h1><p className="ff-readiness-intro-lead">{quizDefinition?.intro.lead ?? "입양 전 필요한 내용을 확인해 보세요."}</p>{previewEnabled && <label className="ff-readiness-preview-control ff-readiness-preview-control-intro"><span className="ff-visually-hidden">결과 미리보기</span><select value={previewResult} onChange={(event) => preview(event.target.value as PreviewResult)} aria-label="결과 미리보기"><option value="">결과 보기</option><option value="success">성공</option><option value="failure">실패</option></select></label>}</section>}

    {phase === "species" && <section className="ff-readiness-species-page" aria-labelledby="readiness-species-title"><h2 id="readiness-species-title"><span className="ff-readiness-question-label" aria-hidden="true">Q.</span>어떤 친구를 만나고 싶나요?</h2><div className="ff-readiness-species-grid" role="group" aria-label="입양을 준비하는 동물"><button type="button" className="ff-readiness-species-choice" data-selected={species === "cat" || undefined} aria-pressed={species === "cat"} onClick={() => setSpecies("cat")}><Image className="ff-readiness-species-image" src="/cat-selection.webp" alt="" aria-hidden="true" width={104} height={104} unoptimized /><strong>고양이</strong></button><button type="button" className="ff-readiness-species-choice" data-selected={species === "dog" || undefined} aria-pressed={species === "dog"} onClick={() => setSpecies("dog")}><Image className="ff-readiness-species-image" src="/dog-selection.webp" alt="" aria-hidden="true" width={104} height={104} unoptimized /><strong>강아지</strong></button></div><p className="ff-readiness-species-description">선택한 친구에 맞춰 입양 전에 알아둘 내용을 확인해 볼게요.</p></section>}

    {phase === "questions" && <section className={`ff-readiness-chapter${hasAnswered ? " is-feedback" : ""}`} aria-labelledby={hasAnswered ? "readiness-feedback-title" : "readiness-question-title"}>{hasAnswered ? <div className="ff-readiness-feedback-page"><div className="ff-readiness-feedback is-incorrect" role="status" aria-live="polite" aria-label="오답 확인"><span className="ff-readiness-feedback-mark" aria-hidden><IconXmarkLine /></span><strong id="readiness-feedback-title" className="ff-readiness-feedback-title">오답이에요!</strong><p className="ff-readiness-feedback-selected" aria-label="내가 고른 답변"><span>내가 고른 답변:</span><span>{question.options[selectedAnswer as number]}</span></p><p className="ff-readiness-feedback-detail">{question.explanation}</p></div></div> : <><h2 id="readiness-question-title"><span className="ff-readiness-question-label" aria-hidden="true">Q.</span>{question.question}<span className="ff-readiness-question-count" aria-label={`${questionIndex + 1}/${questions.length} 문제`}>{questionIndex + 1}/{questions.length}</span></h2><fieldset className="ff-quiz-question ff-quiz-question-single"><legend className="ff-visually-hidden">{question.question}</legend>{question.options.map((option, optionIndex) => { const showCorrectPaw = retryAnswerHintsVisible && pendingAnswer === null && optionIndex === question.answer; return <label key={option} data-correct={showCorrectPaw || undefined}><input type="radio" name={`readiness-chapter-${questionIndex}`} checked={pendingAnswer === optionIndex} onChange={() => setPendingAnswer(optionIndex)} /><span className="ff-quiz-option-label">{option}{showCorrectPaw && <span className="ff-readiness-correct-label" aria-label="정답"><IconPawprintFill aria-hidden /></span>}</span></label>; })}</fieldset></>}</section>}

    {showResult && <section className="ff-readiness-result" role="status"><Image className="ff-readiness-result-illustration" src={passed ? "/readiness-result.webp" : "/readiness-result-failed.webp"} alt={passed ? "강아지와 고양이 캐릭터" : "아쉬워하는 강아지와 고양이 캐릭터"} width={224} height={180} unoptimized /><h2>{correctCount === questions.length ? <span className="ff-readiness-result-count">🎉정답을 모두 맞혔어요!</span> : <><span className="ff-readiness-result-count">{correctCount}문제</span> 정답이에요</>}</h2><div className="ff-readiness-result-praise"><h3>{certificatePraise.title}<span className="ff-readiness-result-score"> · {correctCount}/{questions.length}</span></h3><p>{certificatePraise.description}</p>{!passed && <p className="ff-readiness-result-passing">{passingCount - correctCount}문제를 더 맞히면 통과할 수 있어요.</p>}</div></section>}

    <footer className={`ff-readiness-actions${phase === "intro" || phase === "species" || phase === "questions" ? " is-single" : ""}${feedbackAnswer !== null ? " is-feedback" : ""}`}>{renderFooter()}</footer>
  </div>;
}
