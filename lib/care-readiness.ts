export type CareAnswer = "ready" | "planning" | "unchecked" | "na";
export type CareAnswers = Record<string, CareAnswer>;
export type CareQuestion = { id: string; label: string; action: string; essential?: boolean; na?: string };
export type CareSection = { id: string; label: string; weight: number; questions: CareQuestion[] };

// 서비스 내 준비 진행도를 위한 배점입니다. 입양 적합성을 검증한 평가척도가 아닙니다.
export function careSections(species: "cat" | "dog"): CareSection[] {
  return [
    { id: "daily", label: "매일 돌볼 준비", weight: 20, questions: [
      { id: "carer", label: "매일 식사·배변·위생을 챙길 사람과 시간을 정했나요?", action: "매일 돌볼 사람과 시간 정하기", essential: true },
      { id: "activity", label: species === "dog" ? "친구의 나이·건강·활동량에 맞춰 산책과 놀이 시간을 마련할 수 있나요?" : "친구의 나이·건강·활동량에 맞춰 놀이 시간을 마련할 수 있나요?", action: "친구에게 맞는 활동 계획 세우기" },
    ] },
    { id: "home", label: "안전하게 지낼 집", weight: 20, questions: [
      { id: "permission", label: "지금 사는 집에서 반려동물과 함께 지낼 수 있는지 확인했나요?", action: "반려동물 거주 가능 여부 확인하기", essential: true },
      { id: "safety", label: "창문·현관의 탈출 위험과 집 안의 위험한 물건을 확인하고 정리했나요?", action: "탈출·추락 위험과 위험한 물건 정리하기", essential: true },
      { id: "rest", label: "친구가 편히 쉬고 움직일 수 있는 공간을 마련했나요?", action: "안전한 휴식·활동 공간 마련하기" },
    ] },
    { id: "budget", label: "비용과 진료 준비", weight: 20, questions: [
      { id: "monthly", label: "사료·용품·예방 관리에 드는 정기 비용을 확인하고 예산을 정했나요?", action: "정기 비용 확인하고 예산 정하기" },
      { id: "medical", label: "필요할 때 진료받을 병원과 예상 밖 진료비를 마련할 방법을 정했나요?", action: "진료받을 병원과 비용 마련 방법 정하기", essential: true },
    ] },
    { id: "absence", label: "집을 비울 때의 돌봄", weight: 15, questions: [
      { id: "outing", label: "평소 오래 집을 비울 때 식사·배변·돌봄을 챙길 방법을 정했나요?", action: "장시간 외출할 때의 돌봄 방법 정하기" },
      { id: "backup", label: "여행이나 입원 때 맡길 사람·서비스를 정하고 이용 가능한지 확인했나요?", action: "비상시 돌봄을 부탁할 곳 확인하기" },
    ] },
    { id: "family", label: "가족·기존 동물과의 생활", weight: 10, questions: [
      { id: "responsibility", label: "생활이 바뀌어도 돌봄을 이어갈 방법을 생각하고 책임을 맡기로 했나요?", action: "생활 변화에도 돌봄을 이어갈 방법 정하기" },
      { id: "household", label: "함께 사는 사람 모두 입양에 동의하고 돌봄 역할을 이야기했나요?", action: "동거인과 입양 동의·돌봄 역할 확인하기", na: "혼자 살아요" },
      { id: "existing", label: "기존 동물과 따로 지낼 공간과 천천히 적응할 방법을 준비했나요?", action: "기존 동물과의 분리·적응 계획 세우기", na: "기존 동물이 없어요" },
    ] },
    { id: "settle", label: "입양 상담과 적응 준비", weight: 10, questions: [
      { id: "consult", label: "보호소에 건강·행동·입양 절차에 관해 물어볼 내용을 정했나요?", action: "보호소에 확인할 질문 정리하기" },
      { id: "adjust", label: "첫날부터 천천히 적응하도록 일정과 생활 방식을 정했나요?", action: "처음 함께할 때의 적응 계획 세우기" },
    ] },
    { id: "supplies", label: "기본 용품 준비", weight: 5, questions: [
      { id: "transport", label: "안전한 이동장이나 차량용 안전장비를 준비했나요?", action: "안전하게 데려올 이동장비 준비하기" },
      { id: "food", label: "사료·물그릇과 쉴 자리를 준비했나요?", action: "식사 용품과 쉴 자리 준비하기" },
      { id: "toilet", label: species === "dog" ? "목줄·하네스와 배변용품을 준비했나요?" : "화장실·모래와 스크래처를 준비했나요?", action: "친구에게 맞는 생활용품 준비하기" },
    ] },
  ];
}

export const careStatus = { ready: "준비됐어요", planning: "준비 중이에요", unchecked: "확인 필요", na: "해당 없음" } as const;
export const careAnswerScore = { ready: "100점", planning: "50점", unchecked: "0점", na: "평가 제외" } as const;

export function careGrade(score: number, essentialReady: boolean): "gold" | "silver" | "bronze" {
  return !essentialReady || score < 70 ? "bronze" : score >= 90 ? "gold" : "silver";
}

export function evaluateCare(answers: CareAnswers, species: "cat" | "dog") {
  const sections = careSections(species).map(section => {
    const applicable = section.questions.filter(q => !(q.na && answers[q.id] === "na"));
    const value = (q: CareQuestion) => answers[q.id] === "ready" ? 1 : answers[q.id] === "planning" ? 0.5 : 0;
    const ratio = applicable.reduce((sum, q) => sum + value(q), 0) / applicable.length;
    const essentialReady = applicable.every(q => !q.essential || answers[q.id] === "ready");
    return { ...section, ratio, status: ratio >= 0.7 && essentialReady ? "ready" as const : ratio === 0 ? "unchecked" as const : "planning" as const };
  });
  const questions = sections.flatMap(s => s.questions);
  const pending = questions.filter(q => answers[q.id] !== "ready" && !(q.na && answers[q.id] === "na"))
    .sort((a, b) => Number(Boolean(b.essential)) - Number(Boolean(a.essential)));
  const essentials = pending.filter(q => q.essential);
  const rawScore = sections.reduce((sum, section) => sum + section.weight * section.ratio, 0);
  const score = Math.round(rawScore);
  const tone = careGrade(score, essentials.length === 0);
  const message = tone === "gold" ? "함께할 준비가 차곡차곡 갖춰졌어요" : tone === "silver" ? "함께할 준비를 잘 이어가고 있어요" : "함께하기 전, 먼저 확인할 것이 있어요";
  const applicable = questions.filter(q => !(q.na && answers[q.id] === "na"));
  return { sections, score, tone, message, pending, essentials, readyCount: applicable.filter(q => answers[q.id] === "ready").length, total: applicable.length };
}
