"use client";

import { useMemo, useState } from "react";
import { ActionButton } from "seed-design/ui/action-button";
import { Callout } from "seed-design/ui/callout";
import { SegmentedControl, SegmentedControlItem } from "seed-design/ui/segmented-control";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "seed-design/ui/accordion";
import { RadioGroup, RadioGroupItem } from "seed-design/ui/radio-group";
import { ProgressCircle } from "seed-design/ui/progress-circle";
import { IconCheckmarkCircleFill, IconLightbulbDot5Fill, IconCheckmarkShieldFill } from "@karrotmarket/react-monochrome-icon";

type Species = "cat" | "dog";
type Profile = { homeAllowed: string; homeType: string; household: string; absence: number; careMinutes: number; safety: string; currentPets: string; longAbsence: string; monthlyBudget: number; emergencyFund: number; experience: string };
type Question = { question: string; options: string[]; answer: number; explanation: string };

const commonQuestions: Question[] = [
  { question: "입양 첫날 가장 좋은 행동은 무엇인가요?", options: ["집 전체를 바로 구경시킨다", "조용한 적응 공간과 물·화장실을 준비한다", "친구들을 불러 함께 환영한다"], answer: 1, explanation: "새 환경은 큰 스트레스입니다. 작고 조용한 공간에서 스스로 나올 시간을 주세요." },
  { question: "평소와 달리 먹지 않고 반복해서 구토한다면?", options: ["며칠 더 지켜본다", "사람 약을 조금 먹인다", "보호센터 또는 동물병원에 빠르게 상담한다"], answer: 2, explanation: "식욕 부진과 반복 구토는 지체하지 말고 전문가에게 확인해야 합니다." },
  { question: "예상 밖의 병원비는 어떻게 준비해야 하나요?", options: ["아프지 않을 것이라 생각한다", "비상자금과 도움받을 계획을 미리 세운다", "필요할 때 인터넷 모금을 한다"], answer: 1, explanation: "진료비는 예측하기 어렵습니다. 비상자금과 이동·상담 계획을 함께 준비하세요." },
  { question: "더 이상 돌보기 어려운 상황이 생기면?", options: ["몰래 다른 사람에게 보낸다", "밖에 풀어준다", "보호자·보호센터에 알리고 안전한 해결을 함께 찾는다"], answer: 2, explanation: "재유기·무단 재분양은 금지됩니다. 도움을 일찍 요청하는 것이 책임 있는 행동입니다." },
  { question: "입양 후 사진과 일기를 계속 올려야 하나요?", options: ["매주 의무적으로 올린다", "원할 때만 자발적으로 나눈다", "보호소가 요구하면 평생 올린다"], answer: 1, explanation: "퍼스트 프렌드는 입양 후 생활을 감시하지 않으며 기록은 자발적입니다." },
  { question: "장기간 집을 비우게 된다면?", options: ["사료를 많이 두고 떠난다", "믿을 수 있는 돌봄자·시설·비상 연락 계획을 세운다", "혼자 적응하도록 둔다"], answer: 1, explanation: "장기 부재에는 사람의 돌봄과 비상 대응 계획이 필요합니다." },
];

const speciesQuestions: Record<Species, Question[]> = {
  cat: [
    { question: "고양이의 창문·방묘 안전에 필요한 것은?", options: ["창문을 조금만 연다", "튼튼한 방묘창·방묘문을 설치한다", "높은 층이면 열지 않는다"], answer: 1, explanation: "추락과 탈출은 짧은 순간에 일어납니다. 고정된 방묘 장치가 필요합니다." },
    { question: "끈 장난감을 사용한 뒤에는?", options: ["바닥에 두고 자유롭게 놀게 한다", "닿지 않는 곳에 보관한다", "목에 묶어준다"], answer: 1, explanation: "끈·실은 삼키거나 몸에 감길 수 있어 보호자와 놀 때만 사용해야 합니다." },
    { question: "화장실의 기본 원칙은?", options: ["향이 강한 모래를 쓴다", "청결하게 관리하고 조용한 곳에 둔다", "훈련을 위해 멀리 둔다"], answer: 1, explanation: "고양이가 안심하고 사용할 수 있도록 청결과 위치를 관리해야 합니다." },
    { question: "고양이가 숨어 나오지 않을 때는?", options: ["억지로 끌어낸다", "시간을 주고 먹이·물·화장실을 가까이 둔다", "큰 소리로 부른다"], answer: 1, explanation: "숨는 행동은 자연스러운 적응 과정입니다. 강제로 접촉하지 마세요." },
  ],
  dog: [
    { question: "산책할 때 가장 안전한 준비는?", options: ["목줄 없이 자유롭게 걷는다", "몸에 맞는 하네스·리드줄·인식표를 확인한다", "짧은 줄이면 충분하다"], answer: 1, explanation: "이중 안전장치와 인식표는 낯선 환경에서의 이탈 위험을 줄입니다." },
    { question: "처음 만난 사람이나 개에게는?", options: ["바로 가까이 데려간다", "거리를 두고 반응을 관찰한다", "짖지 못하게 혼낸다"], answer: 1, explanation: "사회성은 천천히 확인해야 하며 불편 신호를 존중해야 합니다." },
    { question: "매일 필요한 활동은?", options: ["배변을 위한 짧은 외출만 한다", "나이·건강·성향에 맞춘 산책과 놀이를 제공한다", "주말에 몰아서 운동한다"], answer: 1, explanation: "규칙적인 산책과 후각 활동은 신체·정서 건강에 중요합니다." },
    { question: "자동차로 이동할 때는?", options: ["창문 밖으로 얼굴을 내밀게 한다", "이동장이나 안전벨트형 장비로 고정한다", "보호자가 안고 탄다"], answer: 1, explanation: "급정거와 문 열림 사고를 막기 위해 안전하게 고정해야 합니다." },
  ],
};

const initialProfile: Profile = { homeAllowed: "yes", homeType: "apartment", household: "yes", absence: 6, careMinutes: 60, safety: "ready", currentPets: "none", longAbsence: "ready", monthlyBudget: 180000, emergencyFund: 1000000, experience: "first" };

export function ReadinessQuiz() {
  const [step, setStep] = useState(0);
  const [species, setSpecies] = useState<Species>("cat");
  const [profile, setProfile] = useState(initialProfile);
  const [answers, setAnswers] = useState<Record<number, number>>({});
  const [saved, setSaved] = useState<"idle" | "saved" | "signin" | "error">("idle");
  const questions = useMemo(() => [...commonQuestions, ...speciesQuestions[species]], [species]);
  const educationScore = Math.round(questions.reduce((score, question, index) => score + (answers[index] === question.answer ? 1 : 0), 0) / questions.length * 100);
  const readinessScore = Math.max(35, Math.min(98, 50 + (profile.homeAllowed === "yes" ? 10 : -12) + (profile.household === "yes" ? 8 : -5) + (profile.absence <= 6 ? 9 : profile.absence <= 9 ? 3 : -7) + (profile.careMinutes >= (species === "dog" ? 90 : 45) ? 8 : 2) + (profile.safety === "ready" ? 7 : 0) + (profile.longAbsence === "ready" ? 5 : 0) + (profile.monthlyBudget >= (species === "dog" ? 200000 : 150000) ? 6 : 1) + (profile.emergencyFund >= 1000000 ? 5 : 1)));
  const monthlyRange = species === "cat" ? [90000, 220000] : [130000, 350000];
  const initialRange = species === "cat" ? [250000, 700000] : [300000, 900000];
  const passed = educationScore >= 80;

  function update<K extends keyof Profile>(key: K, value: Profile[K]) { setProfile((current) => ({ ...current, [key]: value })); }
  async function saveResult() { setSaved("idle"); const response = await fetch("/api/readiness", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ species, profile, readinessScore, educationScore }) }); if (response.ok) setSaved("saved"); else if (response.status === 401) setSaved("signin"); else setSaved("error"); }
  function submitExam() { setStep(3); if (educationScore >= 80) void saveResult(); }

  return <div className="ff-readiness">
    <div className="ff-stepper" aria-label={`입양 준비 과정 ${step + 1}/4`}><div style={{ width: `${(step + 1) * 25}%` }}/></div>
    <div className="ff-step-label">{["생활 환경", "비용과 교육", "필수 시험", "준비 결과"][step]} · {step + 1}/4</div>

    {step === 0 && <section className="ff-form">
      <SegmentedControl value={species} onValueChange={(value) => setSpecies(value as Species)} aria-label="입양을 준비하는 동물"><SegmentedControlItem value="cat">고양이</SegmentedControlItem><SegmentedControlItem value="dog">강아지</SegmentedControlItem></SegmentedControl>
      <RadioGroup label="주거지에서 반려동물을 허용하나요?" value={profile.homeAllowed} onValueChange={(value) => update("homeAllowed", value as string)}><RadioGroupItem value="yes" label="확인했고 허용됩니다"/><RadioGroupItem value="check" label="아직 확인이 필요합니다"/></RadioGroup>
      <div className="ff-field"><label htmlFor="homeType">주거 형태</label><select id="homeType" className="ff-native-select" value={profile.homeType} onChange={(event) => update("homeType", event.target.value)}><option value="studio">원룸·소형 주거</option><option value="apartment">아파트·빌라</option><option value="house">단독주택</option></select></div>
      <RadioGroup label="함께 사는 사람 모두 동의했나요?" value={profile.household} onValueChange={(value) => update("household", value as string)}><RadioGroupItem value="yes" label="모두 동의했어요"/><RadioGroupItem value="talk" label="대화가 더 필요해요"/></RadioGroup>
      <div className="ff-field"><label htmlFor="absence">평일 집을 비우는 시간: {profile.absence}시간</label><input id="absence" type="range" min="1" max="14" value={profile.absence} onChange={(event) => update("absence", Number(event.target.value))}/></div>
      <div className="ff-field"><label htmlFor="careMinutes">매일 직접 돌볼 수 있는 시간: {profile.careMinutes}분</label><input id="careMinutes" type="range" min="20" max="180" step="10" value={profile.careMinutes} onChange={(event) => update("careMinutes", Number(event.target.value))}/></div>
      <RadioGroup label={species === "cat" ? "방묘창·방묘문을 준비했나요?" : "산책·이동 안전장비를 준비했나요?"} value={profile.safety} onValueChange={(value) => update("safety", value as string)}><RadioGroupItem value="ready" label="준비했어요"/><RadioGroupItem value="plan" label="입양 전 설치·구매할게요"/></RadioGroup>
      <div className="ff-condition-grid"><div className="ff-field"><label htmlFor="currentPets">현재 함께 사는 동물</label><select id="currentPets" className="ff-native-select" value={profile.currentPets} onChange={(event) => update("currentPets", event.target.value)}><option value="none">없어요</option><option value="cat">고양이</option><option value="dog">강아지</option><option value="other">기타</option></select></div><div className="ff-field"><label htmlFor="experience">반려 경험</label><select id="experience" className="ff-native-select" value={profile.experience} onChange={(event) => update("experience", event.target.value)}><option value="first">처음이에요</option><option value="past">과거에 있어요</option><option value="current">현재 함께 살고 있어요</option></select></div></div>
      <RadioGroup label="출장·여행 등 장기 부재 계획" value={profile.longAbsence} onValueChange={(value) => update("longAbsence", value as string)}><RadioGroupItem value="ready" label="돌봄자·시설을 정했어요"/><RadioGroupItem value="plan" label="입양 전 정할게요"/></RadioGroup>
      <ActionButton size="large" className="ff-action-link" onClick={() => setStep(1)}>비용과 필수 교육 보기</ActionButton>
    </section>}

    {step === 1 && <section className="ff-form">
      <div className="ff-cost-card"><div><span>예상 월 고정비</span><strong>{monthlyRange[0].toLocaleString()}~{monthlyRange[1].toLocaleString()}원</strong></div><div><span>초기 준비비</span><strong>{initialRange[0].toLocaleString()}~{initialRange[1].toLocaleString()}원</strong></div><div><span>권장 비상자금</span><strong>100만~300만원 이상</strong></div></div>
      <div className="ff-field"><label htmlFor="monthlyBudget">계획한 월 돌봄 예산: {profile.monthlyBudget.toLocaleString()}원</label><input id="monthlyBudget" type="range" min="50000" max="500000" step="10000" value={profile.monthlyBudget} onChange={(event) => update("monthlyBudget", Number(event.target.value))}/></div>
      <div className="ff-field"><label htmlFor="emergencyFund">준비 가능한 비상자금: {profile.emergencyFund.toLocaleString()}원</label><input id="emergencyFund" type="range" min="0" max="5000000" step="100000" value={profile.emergencyFund} onChange={(event) => update("emergencyFund", Number(event.target.value))}/></div>
      <Callout tone="informative" title="금액은 합격 기준이 아니에요" description="지역·병원·건강 상태에 따라 달라집니다. 부족한 부분은 저축, 가족 협의, 보험 비교 등 구체적인 계획으로 보완할 수 있어요."/>
      <h2 className="ff-section-title">시험 전 필수 교육</h2>
      <Accordion defaultValue={["adapt"]} multiple>
        <AccordionItem value="adapt"><AccordionTrigger title="첫날과 적응 기간" description="서두르지 않고 안전한 공간부터"/><AccordionContent><p className="ff-learning-copy">처음 1~2주는 조용한 적응 공간, 일정한 급여·산책 시간, 숨을 곳을 마련하세요. 억지로 안거나 낯선 사람과 바로 만나게 하지 않습니다.</p></AccordionContent></AccordionItem>
        <AccordionItem value="health"><AccordionTrigger title="건강·접종·중성화" description="공공데이터 밖의 정보는 직접 확인"/><AccordionContent><p className="ff-learning-copy">식욕, 배변, 호흡, 통증 신호를 매일 살피고 이상이 있으면 병원에 문의하세요. 접종·중성화·검진 기록은 보호센터와 병원에서 다시 확인합니다.</p></AccordionContent></AccordionItem>
        <AccordionItem value="safety"><AccordionTrigger title={species === "cat" ? "탈출·추락·끈 안전" : "산책·이동·사회성 안전"} description="사고는 준비로 줄일 수 있어요"/><AccordionContent><p className="ff-learning-copy">{species === "cat" ? "방묘창과 방묘문을 고정하고 끈·실·독성 식물·열린 세탁기를 확인하세요." : "몸에 맞는 하네스, 리드줄, 인식표를 사용하고 차량에서는 이동장이나 안전장비로 고정하세요."}</p></AccordionContent></AccordionItem>
        <AccordionItem value="responsibility"><AccordionTrigger title="평생 돌봄과 도움 요청" description="어려움은 숨기지 않고 일찍 알리기"/><AccordionContent><p className="ff-learning-copy">재유기와 무단 재분양은 금지됩니다. 질병·이사·경제 문제로 돌봄이 어려워지면 보호센터와 전문가에게 일찍 도움을 요청하세요. 입양 후 기록은 의무가 아닙니다.</p></AccordionContent></AccordionItem>
      </Accordion>
      <div className="ff-row"><ActionButton variant="neutralWeak" onClick={() => setStep(0)}>이전</ActionButton><ActionButton className="ff-grow" onClick={() => setStep(2)}>필수 시험 시작</ActionButton></div>
    </section>}

    {step === 2 && <section className="ff-form">
      <Callout tone="warning" title="10문항 중 8문항 이상" description="틀려도 불합격자가 되는 것이 아닙니다. 해설을 확인하고 바로 다시 풀 수 있어요."/>
      {questions.map((question, index) => <fieldset className="ff-quiz-question" key={question.question}><legend><span>{index + 1}</span>{question.question}</legend>{question.options.map((option, optionIndex) => <label key={option}><input type="radio" name={`question-${index}`} checked={answers[index] === optionIndex} onChange={() => setAnswers((current) => ({ ...current, [index]: optionIndex }))}/><span>{option}</span></label>)}</fieldset>)}
      <div className="ff-row"><ActionButton variant="neutralWeak" onClick={() => setStep(1)}>교육 다시 보기</ActionButton><ActionButton className="ff-grow" disabled={Object.keys(answers).length < questions.length} onClick={submitExam}>채점하고 결과 보기</ActionButton></div>
    </section>}

    {step === 3 && <section className="ff-result ff-readiness-result" role="status">
      <div className="ff-score-circles"><div><ProgressCircle value={readinessScore}/><strong>{readinessScore}</strong><span>생활 준비도</span></div><div><ProgressCircle value={educationScore}/><strong>{educationScore}</strong><span>필수 시험</span></div></div>
      <h2 className="ff-section-title">{passed ? "필수 교육을 완료했어요" : "조금만 더 확인하면 돼요"}</h2>
      <p className="ff-description" style={{ marginTop: 6 }}>이 점수는 사람의 가치나 동물의 품질을 평가하지 않으며 자동 입양 거절에 사용되지 않습니다.</p>
      <div className="ff-result-groups"><div><h3><IconCheckmarkCircleFill/>잘 준비한 점</h3><p>주거, 돌봄 시간, 예산을 구체적인 숫자로 확인했어요.</p></div><div><h3><IconLightbulbDot5Fill/>입양 전 준비할 점</h3><p>{profile.homeAllowed !== "yes" ? "주거지 허용 여부를 서면으로 확인하세요. " : ""}{profile.household !== "yes" ? "동거인과 책임과 비용을 더 이야기하세요. " : ""}{profile.absence > 9 ? "긴 부재 시간에 방문 돌봄 계획이 필요해요." : "첫 일주일 적응 기간의 일정을 비워두세요."}</p></div><div><h3><IconCheckmarkShieldFill/>보호센터와 상담할 점</h3><p>기존 동물과의 합사, 혼자 있는 시간, 알려진 질환과 투약 정보를 확인하세요.</p></div></div>
      {!passed && <div className="ff-answer-review">{questions.map((question, index) => answers[index] === question.answer ? null : <Callout key={question.question} tone="warning" title={question.question} description={question.explanation}/>)}</div>}
      {saved === "saved" && <Callout tone="positive" title="결과를 안전하게 저장했어요" description="이제 입양 신청을 시작할 수 있어요."/>}
      {saved === "signin" && <Callout
        tone="informative"
        title="결과를 저장해 주세요"
        description="입양 신청에 사용하려면 ChatGPT로 본인 확인이 필요해요."
        linkProps={{ href: "/signin-with-chatgpt?return_to=%2Freadiness", children: "로그인" }}
      />}
      {saved === "error" && <Callout tone="critical" description="결과를 저장하지 못했어요. 잠시 후 다시 시도해 주세요."/>}
      <div className="ff-row" style={{ marginTop: 18 }}>{!passed ? <ActionButton className="ff-grow" onClick={() => { setAnswers({}); setStep(2); }}>해설 보고 다시 풀기</ActionButton> : <><ActionButton variant="neutralWeak" onClick={saveResult}>다시 저장</ActionButton><ActionButton asChild className="ff-grow"><a href="/find">입양할 친구 찾기</a></ActionButton></>}</div>
    </section>}
  </div>;
}
