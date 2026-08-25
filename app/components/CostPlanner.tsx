"use client";

import { useMemo, useState } from "react";
import { catCosts, dogCosts, type CostItem } from "../../lib/care-content";
import { SegmentedControl, SegmentedControlItem } from "seed-design/ui/segmented-control";
import { Slider } from "seed-design/ui/slider";
import { Callout } from "seed-design/ui/callout";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "seed-design/ui/accordion";
import { QuantityPicker } from "seed-design/ui/quantity-picker";
import { ChipTabsList, ChipTabsRoot, ChipTabsTrigger } from "seed-design/ui/chip-tabs";
import { IconChevronDownSmallLine } from "@karrotmarket/react-monochrome-icon";

type Species = "cat" | "dog";
type PetCounts = Record<Species, number>;
type SizeGroup = "small" | "medium" | "large" | "xlarge" | "unknown";
type CalculatorSelections = { neuter: "done" | "needed" | "unknown"; vaccination: "done" | "needed"; checkup: "done" | "needed"; microchip: "done" | "needed"; size: SizeGroup };
export type CalculatorAnimal = { name?: string; species: string; breed?: string; sex?: string; age?: string; traits?: string[]; health?: string[] };
type CostCatalog = Record<Species, CostItem[]>;
type CostPlannerProps = { initialSpecies?: Species; flow?: "inline" | "steps" | "sheet"; animal?: CalculatorAnimal };

const defaultCatalog: CostCatalog = { cat: catCosts, dog: dogCosts };

const money = (value: number) => value === 0 ? "0원" : `${Math.round(value / 10000).toLocaleString("ko-KR")}만원`;
const costRange = (low: number, high: number) => low === 0 && high === 0 ? "0원" : `${money(low)}~${money(high)}`;
const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, Number.isFinite(value) ? value : min));

function useCostTotals(species: Species, quality: number, pets: number, composition?: PetCounts, catalog: CostCatalog = defaultCatalog) {
  const totals = useMemo(() => {
    const safeQuality = clamp(Number(quality), 0, 100) / 100;
    const counts = composition ?? { cat: species === "cat" ? pets : 0, dog: species === "dog" ? pets : 0 };
    const estimate = (cadence: CostItem["cadence"]) => ([{ count: counts.cat, items: catalog.cat }, { count: counts.dog, items: catalog.dog }]).reduce((sum, group) => sum + group.items.filter(item => item.cadence === cadence).reduce((itemSum, item) => itemSum + item.low + (item.high - item.low) * safeQuality, 0) * group.count, 0);
    const monthly = estimate("매달");
    const annualRoutine = monthly * 12 + estimate("매년");
    const initial = estimate("처음");
    return { initial, monthly, annualRoutine, firstYear: initial + annualRoutine, emergency: estimate("비상") };
  }, [catalog, composition, pets, quality, species]);
  const items = composition ? [...(composition.cat > 0 ? catalog.cat : []), ...(composition.dog > 0 ? catalog.dog : [])] : species === "cat" ? catalog.cat : catalog.dog;
  return { items, totals };
}

function calculatorSize(animal: CalculatorAnimal | undefined, species: Species) {
  const text = [...(animal?.traits || []), ...(animal?.health || [])].join(" ");
  const weight = text.match(/(\d+(?:\.\d+)?)\s*\(?kg\)?/i)?.[1];
  if (!weight) return "unknown";
  const value = Number(weight);
  if (species === "cat") return value < 3 ? "small" : value < 6 ? "medium" : value < 10 ? "large" : "xlarge";
  return value < 5 ? "small" : value < 15 ? "medium" : value < 30 ? "large" : "xlarge";
}

function calculatorItems(species: Species, quality: number, animal?: CalculatorAnimal, selections?: CalculatorSelections): CostCatalog {
  const health = [...(animal?.health || []), ...(animal?.traits || [])].join(" ");
  const size = selections?.size || calculatorSize(animal, species);
  const needsGrooming = species === "dog" && /푸들|비숑|말티즈|시츄|요크셔|슈나우저|스파니엘|테리어|그루밍|미용/i.test(animal?.breed || "");
  const sizeFactor = species === "cat" ? { small: .85, medium: 1, large: 1.2, xlarge: 1.4, unknown: 1 }[size] : { small: .7, medium: 1, large: 1.5, xlarge: 2.2, unknown: 1 }[size];
  const scale = (item: CostItem) => item.cadence === "매달" ? { ...item, low: Math.round(item.low * sizeFactor), high: Math.round(item.high * sizeFactor) } : item;
  const apiNeuterCompleted = /중성화\s*(완료|완료로 등록)|중성화 완료/.test(health);
  const completedNeuter = apiNeuterCompleted || selections?.neuter === "done";
  const vaccinationTarget = species === "cat" ? 3 : 5;
  const vaccinationStages = [...health.matchAll(/(\d+)\s*차/g)].map(match => Number(match[1])).filter(stage => stage > 0);
  const vaccinationStage = vaccinationStages.length ? Math.max(...vaccinationStages) : undefined;
  const explicitVaccinationComplete = /(?:종합백신|예방접종)[^.\n]*완료/.test(health) && !/광견병[^.\n]*예방접종[^.\n]*완료/.test(health);
  const completedVaccination = selections?.vaccination === "done" || (vaccinationStage !== undefined ? vaccinationStage >= vaccinationTarget : explicitVaccinationComplete);
  const remainingVaccinations = completedVaccination ? 0 : vaccinationStage === undefined ? vaccinationTarget : Math.max(vaccinationTarget - vaccinationStage, 0);
  const apiMicrochipped = /(인식칩|마이크로칩|칩).*?(등록|완료|있음)/.test(health);
  const microchipped = apiMicrochipped || selections?.microchip === "done";
  const checkupCompleted = /(?:기본|정기|건강)?\s*검진[^.\n]*(?:완료|마침|받음)/.test(health) || selections?.checkup === "done";
  const rabiesCompleted = /광견병[^.\n]*(?:예방접종|접종)[^.\n]*(?:완료|마침|받음)/.test(health);
  const female = /암컷|여아|female/i.test(animal?.sex || "");
  const neuter = species === "cat"
    ? { name: "중성화", cadence: "처음" as const, low: female ? 180000 : 150000, high: female ? 550000 : 400000, note: "성별·체중·검사·입원 여부에 따라 달라져요." }
    : { name: "중성화", cadence: "처음" as const, low: female ? 250000 : 200000, high: female ? 850000 : 600000, note: "성별·체중·검사·입원 여부에 따라 달라져요." };
  const vaccinationLowPerStage = species === "cat" ? 100000 / vaccinationTarget : 150000 / vaccinationTarget;
  const vaccinationHighPerStage = species === "cat" ? 350000 / vaccinationTarget : 450000 / vaccinationTarget;
  const vaccinationName = species === "cat" ? "고양이 종합백신" : "강아지 종합백신";
  const vaccinationProgress = vaccinationStage ? `${vaccinationStage}차까지 완료` : "접종 차수 정보 없음";
  const vaccinationScope = species === "cat"
    ? "FVRCP 혼합백신으로 허피스바이러스·칼리시바이러스·범백혈구감소증을 예방해요."
    : "DHPP/DHPPL 혼합백신으로 홍역·아데노바이러스·파보바이러스 등을 예방해요.";
  const vaccinationCaveat = "백신 제품과 병원에 따라 구성은 달라질 수 있어요.";
  const vaccination = {
    name: vaccinationName,
    cadence: "처음" as const,
    low: Math.round(vaccinationLowPerStage * remainingVaccinations),
    high: Math.round(vaccinationHighPerStage * remainingVaccinations),
    note: completedVaccination
      ? `${vaccinationScope} ${vaccinationName} ${vaccinationTarget}차까지 완료된 정보로 비용을 0원으로 계산했어요. ${vaccinationCaveat}`
      : vaccinationStage
        ? `${vaccinationScope} ${vaccinationProgress} · 남은 접종 ${remainingVaccinations}회 기준으로 계산했어요. ${vaccinationCaveat}`
        : `${vaccinationScope} 접종 차수 정보가 없어 기본 접종 범위를 포함했어요. ${vaccinationCaveat}`,
  };
  const common: CostItem[] = [
    ...(species === "cat" ? [
      { name: "이동장·화장실·식기", cadence: "처음" as const, low: 90000, high: 260000, note: "안전한 이동장과 화장실, 식기를 준비해요." },
      { name: "사료", cadence: "처음" as const, low: 30000, high: 90000, note: "입양 직후 먹을 사료를 먼저 준비해요." },
      { name: "고양이 모래", cadence: "처음" as const, low: 25000, high: 70000, note: "입양 직후 사용할 모래를 먼저 준비해요." },
      { name: "사료", cadence: "매달" as const, low: 30000, high: 90000, note: "체중·질환·처방식 여부에 따라 달라져요." },
      { name: "고양이 모래", cadence: "매달" as const, low: 25000, high: 70000, note: "화장실 수와 선호 모래에 따라 달라져요." },
      { name: "간식", cadence: "매달" as const, low: 10000, high: 40000, note: "주식 균형을 우선하고 훈련·보상용으로 선택해요." },
      { name: "장난감", cadence: "기타" as const, low: 10000, high: 50000, note: "놀이 방식과 교체 주기에 따라 선택적으로 필요한 비용이에요." },
      { name: "영양제", cadence: "기타" as const, low: 10000, high: 60000, note: "건강 상태와 식단에 따라 필요 여부가 달라지는 선택 비용이에요." },
    ] : [
      { name: "이동장·목줄·하네스·식기", cadence: "처음" as const, low: 120000, high: 300000, note: "체형에 맞는 이동장과 목줄, 하네스, 식기를 준비해요." },
      { name: "사료", cadence: "처음" as const, low: 40000, high: 160000, note: "입양 직후 먹을 사료를 먼저 준비해요." },
      { name: "배변패드·배변용품", cadence: "처음" as const, low: 15000, high: 60000, note: "입양 직후 사용할 배변용품을 먼저 준비해요." },
      { name: "사료", cadence: "매달" as const, low: 40000, high: 160000, note: "체급과 활동량, 처방식 여부에 따라 달라져요." },
      { name: "배변패드·배변용품", cadence: "매달" as const, low: 15000, high: 60000, note: "실내 배변이 필요한 상황에 대비해요." },
      { name: "심장사상충·외부기생충 예방", cadence: "매달" as const, low: 15000, high: 50000, note: "투약 주기와 체중은 수의사와 확인해요." },
      ...(needsGrooming ? [{ name: "미용·그루밍", cadence: "매달" as const, low: 50000, high: 150000, note: "견종의 털 관리 특성에 따라 정기적인 미용이 필요할 수 있어요." }] : []),
      { name: "간식", cadence: "매달" as const, low: 15000, high: 50000, note: "주식 균형을 우선하고 훈련·보상용으로 선택해요." },
      { name: "장난감", cadence: "기타" as const, low: 10000, high: 50000, note: "활동량과 놀이 방식에 따라 선택적으로 필요한 비용이에요." },
      { name: "영양제", cadence: "기타" as const, low: 15000, high: 70000, note: "건강 상태와 식단에 따라 필요 여부가 달라지는 선택 비용이에요." },
    ]),
    vaccination,
    { name: "건강검진", cadence: "매년" as const, low: checkupCompleted ? 0 : 50000, high: checkupCompleted ? 0 : 180000, note: checkupCompleted ? "동물 정보에 최근 건강검진 완료로 등록되어 비용을 0원으로 계산했어요." : "기본 진찰과 필요한 검사 범위에 따른 준비 비용이에요." },
    { name: "광견병 예방접종", cadence: "매년" as const, low: rabiesCompleted ? 0 : 20000, high: rabiesCompleted ? 0 : 50000, note: rabiesCompleted ? "동물 정보에 광견병 예방접종 완료로 등록되어 비용을 0원으로 계산했어요." : "일반 예방접종과 별도로 확인하는 연간 접종 범위예요." },
    ...(microchipped ? [] : [{ name: "인식칩", cadence: "처음" as const, low: 30000, high: 60000, note: "인식칩 등록과 시술 비용을 포함한 범위예요." }]),
    { ...neuter, low: completedNeuter ? 0 : neuter.low, high: completedNeuter ? 0 : neuter.high, note: completedNeuter ? "동물 정보에 중성화 완료로 등록되어 비용을 0원으로 계산했어요." : neuter.note },
    { name: "응급 진료 대비금", cadence: "비상" as const, low: species === "cat" ? 1000000 : 1000000, high: species === "cat" ? 3000000 : 3500000, note: "진료비 예측이 아니라 갑작스러운 진료에 대비해 별도로 마련하는 권장 예비자금이에요." },
  ];
  return species === "cat" ? { cat: common.map(scale), dog: [] } : { cat: [], dog: common.map(scale) };
}

function CostSummary({ totals }: { totals: ReturnType<typeof useCostTotals>["totals"] }) {
  return <div className="ff-cost-summary"><div><span>예상 월 생활비</span><strong>{money(totals.monthly)}</strong><small>식비·소모품 등</small></div><div><span>처음 준비할 비용</span><strong>{money(totals.initial)}</strong><small>용품·중성화</small></div><div><span>1년 반복 비용</span><strong>{money(totals.annualRoutine)}</strong><small>월 비용·정기 진료</small></div><div><span>첫해 예상 비용</span><strong>{money(totals.firstYear)}</strong><small>처음 준비 포함</small></div><div><span>응급 예비자금</span><strong>{money(totals.emergency)}</strong><small>월 비용과 별도</small></div></div>;
}

function CostDetails({ items, showNotice = true, flat = false }: { items: CostItem[]; showNotice?: boolean; flat?: boolean }) {
  const details = flat ? <div className="ff-cost-receipt-details-shell"><div className="ff-cost-receipt-details"><Accordion multiple>{items.map(item => <AccordionItem value={`${item.cadence}-${item.name}`} key={`${item.cadence}-${item.name}`}><AccordionTrigger title={item.name} suffixIcon={<><span className="ff-cost-receipt-detail-price">{costRange(item.low, item.high)}</span><IconChevronDownSmallLine aria-hidden /></>}/><AccordionContent>{item.note}</AccordionContent></AccordionItem>)}</Accordion></div></div> : <Accordion multiple>{items.map(item => <AccordionItem value={`${item.cadence}-${item.name}`} key={`${item.cadence}-${item.name}`}><AccordionTrigger title={item.name} description={`${item.cadence} · ${costRange(item.low, item.high)}`}/><AccordionContent>{item.note}</AccordionContent></AccordionItem>)}</Accordion>;
  return <>{showNotice && <Callout tone="warning" title="결정 전 예산을 확인하는 참고 범위예요" description="국내 공개 진료비와 일반적인 양육 항목을 바탕으로 계산하지만, 지역·병원·체중·질환·제품 선택에 따라 달라질 수 있어요."/>}{details}</>;
}

type CostPeriod = "initial" | "monthly" | "routine";

function CostReceipt({ species, animal, selections, quality, items }: { species: Species; animal?: CalculatorAnimal; selections: CalculatorSelections; quality: number; items: CostItem[] }) {
  const health = [...(animal?.health || []), ...(animal?.traits || [])].join(" ");
  const sex = /암컷|여아|female/i.test(animal?.sex || "") ? "암컷" : /수컷|남아|male/i.test(animal?.sex || "") ? "수컷" : "성별 미상";
  const sizeLabel = { small: "소형", medium: "중형", large: "대형", xlarge: "초대형", unknown: "체급 미상" }[selections.size];
  const weight = health.match(/(\d+(?:\.\d+)?)\s*\(?kg\)?/i)?.[1];
  const basis = [species === "cat" ? "고양이" : "강아지", sex, weight ? `${weight}kg` : sizeLabel].filter(Boolean).join(" · ");
  const periods: Array<{ key: CostPeriod; label: string; cadence: CostItem["cadence"][]; description: string }> = [
    { key: "initial", label: "준비", cadence: ["처음"], description: "예상 평균 비용" },
    { key: "monthly", label: "고정 지출", cadence: ["매달"], description: "매달 반복해서 필요한 비용" },
    { key: "routine", label: "그 외", cadence: ["매년", "비상", "기타"], description: "정기·선택적으로 따로 준비하는 비용" },
  ];
  const [period, setPeriod] = useState<CostPeriod>("initial");
  const activePeriod = periods.find(item => item.key === period) || periods[0];
  const matching = items.filter(item => activePeriod.cadence.includes(item.cadence));
  const periodTotal = matching.reduce((sum, item) => sum + item.low + (item.high - item.low) * clamp(Number(quality), 0, 100) / 100, 0);
  return <div className="ff-cost-conversation ff-cost-receipt">
    <div className="ff-cost-chat-bubble ff-cost-chat-bubble-result"><h2>돌봄 계산기</h2><p className="ff-cost-receipt-subtitle"><span>{animal?.name || "이름 미상"}</span><span className="ff-cost-receipt-animal-tag">{basis}</span></p></div>
    <section className="ff-cost-receipt-content" aria-live="polite" aria-label="반려동물 비용 영수증">
      <ChipTabsRoot value={period} onValueChange={value => setPeriod(value as CostPeriod)}>
        <ChipTabsList aria-label="비용 시기 선택">
          {periods.map(item => <ChipTabsTrigger key={item.key} value={item.key}>{item.label}</ChipTabsTrigger>)}
        </ChipTabsList>
      </ChipTabsRoot>
      <div className="ff-cost-receipt-period-content">
        <div className={`ff-cost-receipt-period-heading${period === "routine" ? " is-without-total" : ""}`}><div><small>{activePeriod.description}</small></div>{period !== "routine" && <strong>{money(periodTotal)}</strong>}</div>
        {matching.length > 0 ? <CostDetails items={matching} showNotice={false} flat/> : <p className="ff-cost-receipt-empty">이 시기에 포함된 비용이 없어요.</p>}
      </div>
    </section>
  </div>;
}

function InlineCostPlanner({ species, quality, pets, setSpecies, setQuality, setPets }: { species: Species; quality: number; pets: number; setSpecies: (value: Species) => void; setQuality: (value: number) => void; setPets: (value: number) => void }) {
  const { items, totals } = useCostTotals(species, quality, pets);
  return <><SegmentedControl aria-label="동물 종류" value={species} onValueChange={value => setSpecies(value as Species)}><SegmentedControlItem value="cat">고양이</SegmentedControlItem><SegmentedControlItem value="dog">강아지</SegmentedControlItem></SegmentedControl><div className="ff-cost-controls"><Slider label="제품·돌봄 선택 수준" indicator={quality < 34 ? "기본" : quality < 67 ? "균형" : "여유"} min={0} max={100} values={[clamp(quality, 0, 100)]} onValueChange={value => setQuality(clamp(Number(value[0]), 0, 100))}/><div className="ff-quantity-row"><strong>함께할 동물 수</strong><QuantityPicker value={clamp(Math.floor(pets), 1, 3)} min={1} max={3} onValueChange={value => setPets(clamp(Math.floor(Number(value)), 1, 3))} getValueText={(_, value) => `${value}마리`}/></div></div><CostSummary totals={totals}/><CostDetails items={items}/></>;
}

function CalculatorCostPlanner({ quality, animal }: { quality: number; animal?: CalculatorAnimal }) {
  const detectedSpecies: Species = /고양이|cat/i.test(animal?.species || "") ? "cat" : "dog";
  const detectedHealth = [...(animal?.health || []), ...(animal?.traits || [])].join(" ");
  const detectedNeuter: CalculatorSelections["neuter"] = /중성화\s*(완료|완료로 등록)|중성화 완료/.test(detectedHealth) ? "done" : /중성화.*(않은|안 됨)/.test(detectedHealth) ? "needed" : "unknown";
  const generalVaccinationHealth = detectedHealth.replace(/광견병[^.\n]*/g, "");
  const detectedVaccination: CalculatorSelections["vaccination"] = /(?:종합백신|예방접종|백신)[^.\n]*(?:완료|완료로 등록|완료함)/.test(generalVaccinationHealth) ? "done" : "needed";
  const detectedMicrochip: CalculatorSelections["microchip"] = /(인식칩|마이크로칩|칩).*?(등록|완료|있음)/.test(detectedHealth) ? "done" : "needed";
  const detectedSize = calculatorSize(animal, detectedSpecies);
  const totalSteps = 6;
  const [selectedSpecies, setSelectedSpecies] = useState<Species>(detectedSpecies);
  const [selections, setSelections] = useState<CalculatorSelections>({ neuter: detectedNeuter, vaccination: detectedVaccination, checkup: "needed", microchip: detectedMicrochip, size: detectedSize });
  const [step, setStep] = useState(totalSteps);
  const composition: PetCounts = selectedSpecies === "cat" ? { cat: 1, dog: 0 } : { cat: 0, dog: 1 };
  const catalog = useMemo(() => calculatorItems(selectedSpecies, quality, animal, selections), [animal, quality, selectedSpecies, selections]);
  const { items } = useCostTotals(selectedSpecies, quality, 1, composition, catalog);

  const update = <K extends keyof CalculatorSelections>(key: K, value: CalculatorSelections[K]) => setSelections(current => ({ ...current, [key]: value }));
  const continueButton = () => <button className="ff-cost-chat-continue" type="button" onClick={() => setStep(step + 1)}>다음</button>;
  const choice = (label: string, value: string, selected: boolean, onClick: () => void) => <button type="button" data-value={value} className={`ff-cost-chat-choice-button${selected ? " is-selected" : ""}`} aria-pressed={selected} onClick={onClick}><strong>{label}</strong>{selected && <small>현재 선택</small>}</button>;

  if (step === totalSteps) return <CostReceipt species={selectedSpecies} animal={animal} selections={selections} quality={quality} items={items}/>;

  const titles = [
    ["돌봄 계산기", "어떤 반려동물의 비용을 계산할까요?", "동물 정보를 바탕으로 먼저 선택했어요."],
    ["중성화", "중성화 상태를 확인해 주세요", `${/암컷|여아|female/i.test(animal?.sex || "") ? "암컷" : /수컷|남아|male/i.test(animal?.sex || "") ? "수컷" : "성별 미상"} 기준으로 확인해요.`],
    ["예방접종", "예방접종 상태를 확인해 주세요", "완료 여부에 따라 처음 준비 비용이 달라져요."],
    ["건강검진", "건강검진 비용을 포함할까요?", "정기 검진을 아직 확인하지 않았다면 비용을 포함해요."],
    ["인식칩", "인식칩 등록 상태를 확인해 주세요", "등록 여부에 따라 처음 준비 비용이 달라져요."],
    ["체급", "몸집을 확인해 주세요", "API 체중과 기존 필터 기준을 대조해 자동 선택했어요."],
  ] as const;
  const [eyebrow, title, description] = titles[step];
  return <div className="ff-cost-conversation"><section className="ff-cost-chat-question" aria-labelledby="cost-chat-question-title"><span className="ff-cost-chat-eyebrow">{eyebrow}</span><h2 id="cost-chat-question-title">{title}</h2><p>{description}</p></section>
    {step === 0 && <><div className="ff-cost-chat-choice-list" role="group" aria-label="반려동물 종류">{choice("고양이", "cat", selectedSpecies === "cat", () => setSelectedSpecies("cat"))}{choice("강아지", "dog", selectedSpecies === "dog", () => setSelectedSpecies("dog"))}</div>{continueButton()}</>}
    {step === 1 && <><div className="ff-cost-chat-choice-list">{choice("중성화 완료", "done", selections.neuter === "done", () => update("neuter", "done"))}{choice("중성화 필요", "needed", selections.neuter === "needed", () => update("neuter", "needed"))}{choice("확인 필요", "unknown", selections.neuter === "unknown", () => update("neuter", "unknown"))}</div>{continueButton()}</>}
    {step === 2 && <><div className="ff-cost-chat-choice-list">{choice("예방접종 완료", "done", selections.vaccination === "done", () => update("vaccination", "done"))}{choice("예방접종 필요", "needed", selections.vaccination === "needed", () => update("vaccination", "needed"))}</div>{continueButton()}</>}
    {step === 3 && <><div className="ff-cost-chat-choice-list">{choice("최근 검진 완료", "done", selections.checkup === "done", () => update("checkup", "done"))}{choice("검진 비용 포함", "needed", selections.checkup === "needed", () => update("checkup", "needed"))}</div>{continueButton()}</>}
    {step === 4 && <><div className="ff-cost-chat-choice-list">{choice("인식칩 등록 완료", "done", selections.microchip === "done", () => update("microchip", "done"))}{choice("인식칩 비용 포함", "needed", selections.microchip === "needed", () => update("microchip", "needed"))}</div>{continueButton()}</>}
    {step === 5 && <><div className="ff-cost-chat-choice-list ff-cost-chat-size-list">{([['small', '소형'], ['medium', '중형'], ['large', '대형'], ['xlarge', '초대형']] as const).map(([value, label]) => choice(label, value, selections.size === value, () => update("size", value)))}</div>{continueButton()}</>}
    {step > 0 && <button className="ff-cost-chat-back" type="button" onClick={() => setStep(step - 1)}>이전 확인</button>}
  </div>;
}

export function CostPlanner({ initialSpecies = "cat", flow = "inline", animal }: CostPlannerProps) {
  const [species, setSpecies] = useState<Species>(initialSpecies);
  const [quality, setQuality] = useState(50);
  const [pets, setPets] = useState(1);
  return <div className="ff-cost-planner">{flow === "steps" || flow === "sheet" ? <CalculatorCostPlanner quality={quality} animal={animal}/> : <InlineCostPlanner species={species} quality={quality} pets={pets} setSpecies={setSpecies} setQuality={setQuality} setPets={setPets}/>}</div>;
}
