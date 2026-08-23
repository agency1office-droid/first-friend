"use client";

import { useMemo, useState } from "react";
import Image from "next/image";
import { ActionButton } from "seed-design/ui/action-button";
import { Checkbox } from "seed-design/ui/checkbox";
import { QuantityPicker } from "seed-design/ui/quantity-picker";
import { Slider } from "seed-design/ui/slider";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "seed-design/ui/accordion";
import { IconChevronDownSmallLine, IconChevronLeftLine, IconHouseLine } from "@karrotmarket/react-monochrome-icon";
import { closeToDetail } from "./detailReturn";

type Species = "cat" | "dog";
type HomeSize = "small" | "medium" | "large";
type PetSize = "small" | "medium" | "large" | "xlarge";
type Absence = "plan" | "sometimes" | "none";
type Budget = "planned" | "basic" | "unknown";

const steps = ["species", "time", "home", "size", "existing", "support", "absence", "budget"] as const;

const timeOptions = [
  { value: 0, label: "거의 어려워요" },
  { value: 10, label: "10분 정도" },
  { value: 20, label: "20분 정도" },
  { value: 30, label: "30분 정도" },
  { value: 60, label: "1시간 이상" },
];

const homeOptions: { value: HomeSize; label: string; detail: string }[] = [
  { value: "small", label: "4~10평 · 소형 주거", detail: "원룸처럼 생활 공간을 알차게 써요" },
  { value: "medium", label: "10~20평 · 중형 주거", detail: "생활 공간을 나눠 사용할 수 있어요" },
  { value: "large", label: "20평 이상 · 넓은 주거", detail: "친구가 지낼 여유 있는 공간을 만들 수 있어요" },
];

const petSizeOptions: { value: PetSize; label: string }[] = [
  { value: "small", label: "소형" },
  { value: "medium", label: "중형" },
  { value: "large", label: "대형" },
  { value: "xlarge", label: "초대형" },
];

type PreparationItem = { id: string; label: string; detail: string };
type PreparationCategory = { title: string; description: string; items: PreparationItem[] };

const commonPreparationItems: PreparationItem[] = [
  { id: "shelter-contact", label: "보호소 상담·방문 일정을 확인했어요", detail: "입양 조건과 필요한 서류를 먼저 확인해요." },
  { id: "transport", label: "안전하게 이동할 방법을 준비했어요", detail: "잠금장치가 있는 이동장이나 차량용 안전장비가 필요해요." },
  { id: "food-water", label: "사료와 물그릇을 준비했어요", detail: "갑자기 사료를 바꾸지 않도록 기존 정보를 확인해요." },
  { id: "health", label: "예방접종·진료 계획을 세웠어요", detail: "기록을 확인하고 처음 방문할 병원을 정해요." },
];

const preparationItemsFor = (species: Species | null): PreparationItem[] => [
  ...commonPreparationItems,
  species === "dog"
    ? { id: "dog-walk", label: "목줄·하네스와 배변용품을 준비했어요", detail: "첫 산책은 적응 상태를 살피며 천천히 시작해요." }
    : { id: "cat-litter", label: "화장실과 모래, 스크래처를 준비했어요", detail: "조용하고 안전한 곳에 생활용품을 마련해요." },
  species === "dog"
    ? { id: "dog-rest", label: "쉴 자리와 혼자 있을 공간을 마련했어요", detail: "처음에는 낯선 환경에서 쉴 수 있는 자리가 필요해요." }
    : { id: "cat-play", label: "숨을 곳과 놀이용품을 준비했어요", detail: "숨거나 쉬고 싶을 때 선택할 수 있는 공간을 만들어요." },
];

const preparationCategoriesFor = (items: PreparationItem[]): PreparationCategory[] => [
  {
    title: "보호소 상담과 이동",
    description: "만남 전 일정과 안전하게 데려올 방법을 준비해요.",
    items: items.filter(item => ["shelter-contact", "transport"].includes(item.id)),
  },
  {
    title: "생활용품과 공간",
    description: "첫날부터 필요한 기본 환경을 마련해요.",
    items: items.filter(item => ["food-water", "dog-walk", "cat-litter"].includes(item.id)),
  },
  {
    title: "건강과 적응",
    description: "진료 계획과 편안히 적응할 자리를 준비해요.",
    items: items.filter(item => ["health", "dog-rest", "cat-play"].includes(item.id)),
  },
];

export function CareReadinessFlow() {
  const [step, setStep] = useState(0);
  const [species, setSpecies] = useState<Species | null>(null);
  const [timeIndex, setTimeIndex] = useState(2);
  const time = timeOptions[timeIndex].value;
  const [home, setHome] = useState<HomeSize | null>(null);
  const [petSize, setPetSize] = useState<PetSize | null>(null);
  const [existingCatCount, setExistingCatCount] = useState(0);
  const [existingDogCount, setExistingDogCount] = useState(0);
  const [householdCount, setHouseholdCount] = useState(0);
  const [absence, setAbsence] = useState<Absence | null>(null);
  const [budget, setBudget] = useState<Budget | null>(null);
  const [preparations, setPreparations] = useState<Record<string, boolean>>({});

  const preparationItems = useMemo(() => preparationItemsFor(species), [species]);
  const preparationCategories = useMemo(() => preparationCategoriesFor(preparationItems), [preparationItems]);
  const preparationCount = preparationItems.filter(item => preparations[item.id]).length;
  const totalSteps = steps.length + preparationCategories.length;
  const isChecklist = step >= steps.length && step < totalSteps;
  const isResult = step === totalSteps;
  const checklistIndex = isChecklist ? step - steps.length : -1;
  const currentChecklist = preparationCategories[checklistIndex];
  const currentStep = isChecklist ? "checklist" : steps[step];
  const canContinue = currentStep === "species" ? species !== null : currentStep === "home" ? home !== null : currentStep === "size" ? petSize !== null : currentStep === "absence" ? absence !== null : currentStep === "budget" ? budget !== null : true;
  const progress = isResult ? 100 : (step / totalSteps) * 100;

  const results = useMemo(() => {
    const homeIndex = home === "small" ? 0 : home === "medium" ? 1 : 2;
    const sizeIndex = petSize === "small" ? 0 : petSize === "medium" ? 1 : petSize === "large" ? 2 : 3;
    const spaceReady = home !== null && petSize !== null && homeIndex >= Math.min(sizeIndex, 2);
    return [
      { label: "함께할 시간", ready: time >= (species === "dog" ? 30 : 20), detail: species === "dog" ? "매일 산책할 시간을 생각해 봤어요." : "매일 놀아줄 시간을 생각해 봤어요." },
      { label: "집과 생활 공간", ready: spaceReady, detail: spaceReady ? "친구의 크기에 맞춰 공간을 살펴봤어요." : "친구가 지낼 공간과 생활 방식을 더 확인해 보세요." },
      { label: "현재 함께 사는 동물", ready: existingCatCount + existingDogCount === 0, detail: existingCatCount + existingDogCount === 0 ? "새로운 친구를 맞이할 환경을 확인했어요." : `고양이 ${existingCatCount}마리·강아지 ${existingDogCount}마리와 지낼 공간과 적응 시간을 준비해 주세요.` },
      { label: "함께 돌볼 사람", ready: householdCount >= 2, detail: householdCount >= 2 ? `${householdCount}명이 돌봄을 나눌 수 있어요.` : "혼자 맡을 돌봄 시간과 도움받을 방법을 함께 계획해 주세요." },
      { label: "집을 비울 때", ready: absence === "plan", detail: absence === "plan" ? "집을 비울 때의 돌봄 방법을 정했어요." : "여행이나 입원 때 맡길 방법을 미리 알아보세요." },
      { label: "경제적인 준비", ready: budget === "planned", detail: budget === "planned" ? "월 비용과 예상 밖의 진료비까지 생각했어요." : "월 비용과 비상 진료비를 계산해 보면 좋아요." },
      { label: "입양 전 준비물", ready: preparationCount === preparationItems.length, detail: `${preparationCount}/${preparationItems.length}개를 준비했거나 준비할 예정이에요.` },
    ];
  }, [absence, budget, existingCatCount, existingDogCount, householdCount, home, petSize, preparationCount, preparationItems, species, time]);

  const readyCount = results.filter(result => result.ready).length;

  function next() {
    if (!canContinue) return;
    setStep(value => value + 1);
  }

  function previous() {
    if (step === 0) return closeToDetail();
    setStep(value => value - 1);
  }

  function retry() {
    setStep(0);
    setSpecies(null);
    setTimeIndex(2);
    setHome(null);
    setPetSize(null);
    setExistingCatCount(0);
    setExistingDogCount(0);
    setHouseholdCount(0);
    setAbsence(null);
    setBudget(null);
    setPreparations({});
  }

  return <div className="ff-readiness ff-care-readiness" data-care-step={isResult ? "result" : currentStep}>
    <header className="ff-readiness-appbar">
      <button type="button" className="ff-readiness-back" onClick={previous} aria-label="이전으로"><IconChevronLeftLine aria-hidden /></button>
      <strong>함께할 생활 확인</strong>
      <button type="button" className="ff-readiness-home" onClick={() => window.location.assign("/")} aria-label="홈으로 이동"><IconHouseLine aria-hidden /></button>
    </header>
    <div className="ff-readiness-progress" role="progressbar" aria-label="생활 점검 진행률" aria-valuemin={1} aria-valuemax={totalSteps} aria-valuenow={isResult ? totalSteps : step + 1}><div style={{ width: `${isResult ? 100 : Math.max(progress, 6.25)}%` }} /></div>
    {isResult ? <section className="ff-care-result" aria-labelledby="care-result-title">
      <h1 id="care-result-title">함께할 생활 준비도</h1>
      <div className="ff-care-result-score" style={{ background: `conic-gradient(var(--seed-color-bg-brand-solid) ${Math.round((readyCount / results.length) * 100)}%, var(--seed-color-bg-neutral-weak) 0)` }}>
        <div><strong>{Math.round((readyCount / results.length) * 100)}</strong><span>%</span></div>
      </div>
      <p className="ff-care-result-summary">{results.length}가지 항목 중 <strong>{readyCount}가지</strong>를 확인했어요. 준비물은 <strong>{preparationCount}/{preparationItems.length}개</strong>예요.</p>
      <Accordion className="ff-care-result-accordion" multiple>
        {results.map(result => <AccordionItem value={result.label} key={result.label}>
          <AccordionTrigger title={result.label} suffixIcon={<><span className={result.ready ? "is-ready" : "is-check"}>{result.ready ? "100점" : "0점"}</span><IconChevronDownSmallLine aria-hidden /></>} />
          <AccordionContent><p>{result.detail}</p></AccordionContent>
        </AccordionItem>)}
      </Accordion>
      <p className="ff-care-result-note">이 결과는 입양 가능 여부를 판단하지 않아요. 보호소 상담과 실제 생활 조건을 함께 확인해 주세요.</p>
    </section> : <section className="ff-care-step" aria-labelledby="care-step-title">
      <p className="ff-care-step-count">{step + 1}/{totalSteps}</p>
      {currentStep === "species" && <><h1 id="care-step-title">어떤 친구와 함께하고 싶나요?</h1><div className="ff-care-choice-grid"><button type="button" className="ff-care-species-choice" data-selected={species === "cat" || undefined} onClick={() => setSpecies("cat")}><Image src="/cat-selection.webp" alt="" width={104} height={104} unoptimized /><strong>고양이</strong></button><button type="button" className="ff-care-species-choice" data-selected={species === "dog" || undefined} onClick={() => setSpecies("dog")}><Image src="/dog-selection.webp" alt="" width={104} height={104} unoptimized /><strong>강아지</strong></button></div><p className="ff-care-helper">친구에 맞춰 필요한 생활 조건을 살펴볼게요.</p></>}
      {currentStep === "time" && <><h1 id="care-step-title">{species === "dog" ? "매일 산책할 시간을 만들 수 있나요?" : "매일 놀아줄 시간을 만들 수 있나요?"}</h1><p className="ff-care-helper">{species === "dog" ? "산책 외에도 식사와 배변을 챙길 시간이 필요해요." : "짧은 놀이를 매일 이어가는 게 좋아요."}</p><div className="ff-care-slider-value">{time === 0 ? "거의 어려워요" : `하루 ${time >= 60 ? "1시간 이상" : `${time}분`}`}</div><Slider className="ff-care-slider" label="하루에 함께할 시간" values={[timeIndex]} min={0} max={timeOptions.length - 1} step={1} ticks={timeOptions.map((_, index) => index)} hideValueIndicator onValuesChange={value => setTimeIndex(Math.max(0, Math.min(timeOptions.length - 1, Number(value[0]))))} /><div className="ff-care-slider-labels"><span>거의 어려워요</span><span>1시간 이상</span></div></>}
      {currentStep === "home" && <><h1 id="care-step-title">우리 집에서 친구가<br />지낼 공간은 어느 정도인가요?</h1><div className="ff-care-option-list">{homeOptions.map(option => <button type="button" className="ff-care-option" data-selected={home === option.value || undefined} key={option.value} onClick={() => setHome(option.value)}><strong>{option.label}</strong><small>{option.detail}</small></button>)}</div></>}
      {currentStep === "size" && <><h1 id="care-step-title">함께하고 싶은 친구의<br />크기를 골라주세요.</h1><p className="ff-care-helper">홈에서 사용하는 크기 기준과 같아요.</p><div className="ff-care-size-grid">{petSizeOptions.map(option => <button type="button" className="ff-care-size-choice" data-selected={petSize === option.value || undefined} key={option.value} onClick={() => setPetSize(option.value)}>{option.label}</button>)}</div></>}
      {currentStep === "existing" && <><h1 id="care-step-title">지금 함께 사는<br />고양이와 강아지는 몇 마리인가요?</h1><p className="ff-care-helper">새로 만날 친구를 제외하고, 현재 함께 사는 동물을 각각 알려주세요.</p><div className="ff-care-quantity-list"><div className="ff-care-quantity"><strong>고양이</strong><QuantityPicker value={existingCatCount} min={0} max={4} onValueChange={value => setExistingCatCount(Math.floor(Number(value)))} getValueText={(_, value) => `${value}마리`} /></div><div className="ff-care-quantity"><strong>강아지</strong><QuantityPicker value={existingDogCount} min={0} max={4} onValueChange={value => setExistingDogCount(Math.floor(Number(value)))} getValueText={(_, value) => `${value}마리`} /></div></div></>}
      {currentStep === "support" && <><h1 id="care-step-title">함께 사는 사람은<br />몇 명인가요?</h1><p className="ff-care-helper">같이 사는 사람 수를 기준으로 돌봄을 나눌 수 있는지 살펴볼게요.</p><div className="ff-care-quantity"><strong>함께 사는 사람</strong><QuantityPicker value={householdCount} min={0} max={6} onValueChange={value => setHouseholdCount(Math.floor(Number(value)))} getValueText={(_, value) => `${value}명`} /></div></>}
      {currentStep === "absence" && <><h1 id="care-step-title">집을 오래 비울 때<br />돌볼 방법을 정했나요?</h1><div className="ff-care-option-list">{[["plan", "맡길 가족·지인·서비스를 정했어요"], ["sometimes", "가족에게 부탁할 수 있을 것 같아요"], ["none", "아직 정하지 않았어요"]].map(([value, label]) => <button type="button" className="ff-care-option" data-selected={absence === value || undefined} key={value} onClick={() => setAbsence(value as Absence)}><strong>{label}</strong></button>)}</div></>}
      {currentStep === "budget" && <><h1 id="care-step-title">매달 필요한 비용과<br />병원비를 준비할 수 있나요?</h1><div className="ff-care-option-list">{[["planned", "월 비용과 비상 진료비까지 계획했어요"], ["basic", "기본 비용은 가능하지만 더 알아봐야 해요"], ["unknown", "비용은 아직 계산해 보지 않았어요"]].map(([value, label]) => <button type="button" className="ff-care-option" data-selected={budget === value || undefined} key={value} onClick={() => setBudget(value as Budget)}><strong>{label}</strong></button>)}</div></>}
      {isChecklist && currentChecklist && <><h1 id="care-step-title">{currentChecklist.title}</h1><p className="ff-care-helper">준비했거나 준비할 예정인 항목을 확인해요.</p><p className="ff-care-helper ff-care-helper-detail">{currentChecklist.description}</p><div className="ff-care-checklist" aria-label={`${currentChecklist.title} 준비 목록`}>{currentChecklist.items.map(item => <div className="ff-care-checklist-row" key={item.id}><Checkbox checked={Boolean(preparations[item.id])} onCheckedChange={checked => setPreparations(current => ({ ...current, [item.id]: Boolean(checked) }))} label={<><strong>{item.label}</strong><small>{item.detail}</small></>} /></div>)}</div></>}
    </section>}
    <div className={`ff-readiness-actions ${isResult ? "is-result" : "is-single"}`}>
      {isResult ? <><ActionButton size="large" variant="neutralWeak" className="ff-grow" onClick={retry}>다시 확인하기</ActionButton><ActionButton size="large" variant="brandSolid" className="ff-grow" onClick={closeToDetail}>닫기</ActionButton></> : <ActionButton size="large" variant="brandSolid" className="ff-grow" disabled={!canContinue} onClick={next}>{step === totalSteps - 1 ? "결과 보기" : "다음"}</ActionButton>}
    </div>
  </div>;
}
