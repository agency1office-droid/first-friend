"use client";

import { useEffect, useMemo, useState } from "react";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "seed-design/ui/accordion";
import { Badge } from "seed-design/ui/badge";
import { ProgressCircle } from "seed-design/ui/progress-circle";
import { SegmentedControl, SegmentedControlItem } from "seed-design/ui/segmented-control";
import { IconCheckmarkCircleFill, IconCheckmarkShieldFill, IconClockLine, IconHouseLine } from "@karrotmarket/react-monochrome-icon";
import { catCosts, dogCosts } from "../../lib/care-content";
import { readinessScore as calculateReadiness, type ReadinessProfile } from "../../lib/readiness-score";

type Species = "cat" | "dog";
type Profile = ReadinessProfile & { homeType: string; currentPets: string; experience: string };
type Assessment = { species?: Species; profile_json?: string; readiness_score?: number; education_score?: number };

const defaultProfile: Profile = { homeAllowed: "yes", homeType: "apartment", household: "yes", absence: 6, careMinutes: 60, safety: "ready", currentPets: "none", longAbsence: "ready", monthlyBudget: 180000, emergencyFund: 1000000, experience: "first" };
const formatMoney = (value: number) => `${Math.round(value / 10000).toLocaleString("ko-KR")}만원`;

function profileFromAssessment(assessment: Assessment | null): Profile | null {
  if (!assessment?.profile_json) return null;
  try {
    const value = JSON.parse(assessment.profile_json) as Partial<Profile>;
    if (!value || typeof value !== "object") return null;
    return { ...defaultProfile, ...value, absence: Number(value.absence) || defaultProfile.absence, careMinutes: Number(value.careMinutes) || defaultProfile.careMinutes, monthlyBudget: Number(value.monthlyBudget) || defaultProfile.monthlyBudget, emergencyFund: Number(value.emergencyFund) || defaultProfile.emergencyFund };
  } catch { return null; }
}

function ageInYears(raw: string) {
  const value = String(raw || "");
  if (value.includes("60일미만")) return 0;
  const birthYear = value.match(/((?:19|20)\d{2})\s*(?:\([^)]*\))?\s*년생/);
  if (birthYear) return Math.max(0, new Date().getFullYear() - Number(birthYear[1]));
  const months = value.match(/(\d+(?:\.\d+)?)\s*개월/);
  if (months) return Math.max(0, Number(months[1]) / 12);
  const years = value.match(/(\d+(?:\.\d+)?)\s*살/);
  return years ? Math.max(0, Number(years[1])) : 0;
}

function lifespan(species: Species, breed: string) {
  if (/한국 고양이|코리안숏헤어|한국고양이/.test(breed)) return [12, 18];
  return species === "cat" ? [12, 18] : [10, 16];
}

function costRange(species: Species) {
  const items = species === "cat" ? catCosts : dogCosts;
  const monthly = items.filter(item => item.cadence === "매달");
  const initial = items.filter(item => item.cadence === "처음");
  const vaccine = items.find(item => item.name.includes("예방접종"));
  return {
    monthly: [monthly.reduce((sum, item) => sum + item.low, 0), monthly.reduce((sum, item) => sum + item.high, 0)],
    initial: [initial.reduce((sum, item) => sum + item.low, 0) + (vaccine?.low || 0), initial.reduce((sum, item) => sum + item.high, 0) + (vaccine?.high || 0)],
  };
}

function compatibilityMessage(score: number, profile: Profile, species: Species) {
  if (score >= 80) return `${species === "cat" ? "고양이" : "강아지"}와 함께할 생활 조건을 잘 살펴보고 있어요.`;
  if (score >= 65) return "몇 가지를 더 준비하면 서로 편안한 생활을 시작할 수 있어요.";
  if (profile.absence > 9) return "긴 부재 시간에 대비한 돌봄자나 방문 돌봄 계획을 먼저 세워 주세요.";
  if (profile.household !== "yes") return "함께 사는 가족과 책임·비용을 먼저 충분히 이야기해 주세요.";
  return "입양 전 보호소와 생활 습관을 더 자세히 상담해 보세요.";
}

export function AdoptionPlanningCard({ species, breed, animalAge }: { species: string; breed: string; animalAge: string }) {
  const animalSpecies: Species = species.includes("고양이") ? "cat" : "dog";
  const [profile, setProfile] = useState<Profile>(defaultProfile);
  const [assessment, setAssessment] = useState<Assessment | null>(null);
  const [source, setSource] = useState<"guest" | "saved" | "signed-in">("guest");
  const [loading, setLoading] = useState(true);
  const [inputOpen, setInputOpen] = useState(false);
  const ranges = useMemo(() => costRange(animalSpecies), [animalSpecies]);
  const [average, maximum] = lifespan(animalSpecies, breed);
  const remaining = [Math.max(1, Math.ceil(average - ageInYears(animalAge))), Math.max(1, Math.ceil(maximum - ageInYears(animalAge)))];
  const score = assessment?.species === animalSpecies && typeof assessment.readiness_score === "number" ? assessment.readiness_score : calculateReadiness(animalSpecies, profile);
  const education = assessment?.species === animalSpecies && typeof assessment.education_score === "number" ? assessment.education_score : null;
  const careSummary = animalSpecies === "cat" ? "짧은 사냥놀이를 하루 여러 번 나누고 화장실을 매일 관리해요." : "나이와 건강에 맞는 산책·후각 놀이 시간을 매일 확보해요.";
  const spaceSummary = animalSpecies === "cat" ? "방묘창·방묘문과 숨을 곳, 분리된 화장실 자리가 필요해요." : "안전한 이동 장비와 휴식 공간, 매일의 산책 동선이 필요해요.";

  useEffect(() => {
    let active = true;
    fetch("/api/readiness").then(async response => response.ok ? response.json() as Promise<{ assessment?: Assessment | null }> : null).then(body => {
      if (!active) return;
      const savedAssessment = body?.assessment || null;
      const savedProfile = profileFromAssessment(savedAssessment);
      if (savedProfile) { setProfile(savedProfile); setSource("saved"); setInputOpen(false); }
      else if (body) setSource("signed-in");
      setAssessment(savedAssessment);
      setLoading(false);
    }).catch(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, []);

  function update<K extends keyof Profile>(key: K, value: Profile[K]) { setProfile(current => ({ ...current, [key]: value })); setSource("guest"); setAssessment(current => current?.species === animalSpecies ? null : current); }
  const speciesLabel = animalSpecies === "cat" ? "고양이" : "강아지";
  const updateSource = loading ? "입양 준비 정보를 확인하는 중이에요." : source === "saved" ? "최근 입양 준비 시험 결과를 반영했어요." : source === "signed-in" ? "시험 결과가 없어 기본값으로 계산했어요. 직접 입력해 보세요." : "아래 정보를 입력하면 내 생활에 맞게 계산해요.";

  return <section className="ff-adoption-planning" aria-labelledby="adoption-planning-title">
    <div className="ff-section-head"><div><div className="ff-kicker">입양 준비를 숫자로 확인해요</div><h2 className="ff-section-title" id="adoption-planning-title">이 친구와 함께할 준비를 살펴봐요</h2></div><Badge tone="neutral" variant="weak">참고용</Badge></div>
    <div className="ff-adoption-planning-intro"><strong>{source === "saved" ? "내 입양 준비 결과를 반영했어요" : "입양 전에 필요한 숫자를 한눈에 확인해요"}</strong><span>{updateSource} 입양을 결정하는 기준이 아닌 준비용 참고 자료예요.</span></div>
    <div className="ff-adoption-planning-summary">
      <div><span>함께할 시간</span><strong>약 {remaining[0]}~{remaining[1]}년</strong><small>평균 {average}년 · 장수 시 {maximum}년</small></div>
      <div className="ff-adoption-planning-summary-primary"><span>월 생활비</span><strong>{formatMoney(ranges.monthly[0])}~{formatMoney(ranges.monthly[1])}</strong><small>사료·간식·모래/패드 등</small></div>
      <div><span>초기 준비비</span><strong>{formatMoney(ranges.initial[0])}~{formatMoney(ranges.initial[1])}</strong><small>용품·중성화·예방접종</small></div>
    </div>
    <div className="ff-adoption-compatibility">
      <div className="ff-adoption-compatibility-score"><ProgressCircle value={score}/><strong>{score}</strong><span>생활 궁합</span></div>
      <div><div className="ff-kicker">나와 이 친구의 생활 궁합</div><p>{compatibilityMessage(score, profile, animalSpecies)}</p><small>주거·가족 동의·부재 시간·돌봄 시간·예산을 비교한 참고 점수예요.</small>{education !== null && <div className="ff-adoption-score-meta">생활 준비도 {score}점 · 상식 시험 {education}점</div>}</div>
    </div>
    <div className="ff-adoption-quick-check" aria-label="입양 전 핵심 생활 기준"><div><IconClockLine aria-hidden /><span><strong>하루 돌봄</strong>{careSummary}</span></div><div><IconHouseLine aria-hidden /><span><strong>집 환경</strong>{spaceSummary}</span></div></div>
    <Accordion multiple defaultValue={inputOpen ? ["profile"] : []} onValueChange={values => setInputOpen(values.includes("profile"))}>
      <AccordionItem value="profile"><AccordionTrigger title="내 생활 정보로 다시 계산하기" description={source === "saved" ? "자동으로 반영된 값을 수정할 수 있어요" : "로그인하지 않아도 입력할 수 있어요"}/><AccordionContent>
        <div className="ff-adoption-inputs">
          <SegmentedControl value={profile.household} onValueChange={value => update("household", String(value))} aria-label="가족 동의 여부"><SegmentedControlItem value="yes">가족 모두 동의</SegmentedControlItem><SegmentedControlItem value="talk">상의가 필요해요</SegmentedControlItem></SegmentedControl>
          <label className="ff-field"><span>주거 형태</span><select className="ff-native-select" value={profile.homeType} onChange={event => update("homeType", event.target.value)}><option value="studio">원룸·소형 주거</option><option value="apartment">아파트·빌라</option><option value="house">단독주택</option></select></label>
          <label className="ff-field"><span>평일 집을 비우는 시간: {profile.absence}시간</span><input type="range" min="1" max="14" value={profile.absence} onChange={event => update("absence", Number(event.target.value))}/></label>
          <label className="ff-field"><span>매일 직접 돌볼 수 있는 시간: {profile.careMinutes}분</span><input type="range" min="20" max="180" step="10" value={profile.careMinutes} onChange={event => update("careMinutes", Number(event.target.value))}/></label>
          <label className="ff-field"><span>계획한 월 돌봄 예산: {profile.monthlyBudget.toLocaleString("ko-KR")}원</span><input type="range" min="50000" max="500000" step="10000" value={profile.monthlyBudget} onChange={event => update("monthlyBudget", Number(event.target.value))}/></label>
        </div>
      </AccordionContent></AccordionItem>
      <AccordionItem value="care"><AccordionTrigger title="하루 돌봄과 집 환경" description={`${speciesLabel}와 맞춰볼 생활 기준`}/><AccordionContent><ul className="ff-adoption-checklist">{(animalSpecies === "cat" ? ["화장실과 물·밥자리를 분리하고 매일 청소해요.", "방묘창·방묘문과 끈·백합 같은 위험 요소를 확인해요.", "짧은 사냥놀이를 여러 번 나누고 숨을 곳을 마련해요."] : ["나이와 건강에 맞는 산책·후각 놀이 시간을 매일 확보해요.", "하네스·리드줄·인식표와 혼자 있을 때의 안전을 확인해요.", "비·눈·폭염에도 배변과 돌봄을 이어갈 계획을 세워요."]) .map(item => <li key={item}><IconCheckmarkCircleFill aria-hidden />{item}</li>)}</ul></AccordionContent></AccordionItem>
      <AccordionItem value="prepare"><AccordionTrigger title="입양 전에 확인할 것" description="보호소 상담에서 꼭 물어봐요"/><AccordionContent><ul className="ff-adoption-checklist"><li><IconCheckmarkShieldFill aria-hidden />접종·중성화·검진 기록과 현재 복용약을 확인해요.</li><li><IconCheckmarkShieldFill aria-hidden />혼자 있는 시간, 사람·다른 동물과의 반응을 물어봐요.</li><li><IconCheckmarkShieldFill aria-hidden />예상 밖의 진료비와 장기 부재 때 맡길 계획을 가족과 정해요.</li></ul></AccordionContent></AccordionItem>
    </Accordion>
    <p className="ff-adoption-planning-note">수명·비용은 품종, 체격, 건강 상태, 지역과 병원에 따라 달라질 수 있어요. 정확한 정보와 입양 상담은 보호소와 동물병원에 확인해 주세요.</p>
  </section>;
}
