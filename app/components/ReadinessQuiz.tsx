"use client";

import { useState } from "react";
import { ActionButton } from "seed-design/ui/action-button";
import { Callout } from "seed-design/ui/callout";
import { IconLightbulbDot5Fill } from "@karrotmarket/react-monochrome-icon";

export function ReadinessQuiz() {
  const [home, setHome] = useState("allowed");
  const [hours, setHours] = useState(5);
  const [budget, setBudget] = useState("ready");
  const [consent, setConsent] = useState("yes");
  const [done, setDone] = useState(false);
  const score = Math.max(42, Math.min(96, 52 + (home === "allowed" ? 15 : 0) + (hours <= 6 ? 12 : hours <= 9 ? 5 : 0) + (budget === "ready" ? 10 : 3) + (consent === "yes" ? 9 : 0)));

  return <>
    <div className="ff-form">
      <div className="ff-field"><label htmlFor="home">주거지에서 반려동물을 허용하나요?</label><select className="ff-native-select" id="home" value={home} onChange={(event) => setHome(event.target.value)}><option value="allowed">확인했고 허용됩니다</option><option value="check">아직 확인이 필요합니다</option></select></div>
      <div className="ff-field"><label htmlFor="hours">평일에 집을 비우는 시간: {hours}시간</label><input id="hours" type="range" min="1" max="14" value={hours} onChange={(event) => setHours(Number(event.target.value))} /></div>
      <div className="ff-field"><label htmlFor="budget">예상 밖 진료비를 위한 계획</label><select className="ff-native-select" id="budget" value={budget} onChange={(event) => setBudget(event.target.value)}><option value="ready">비상자금 또는 보험을 준비했어요</option><option value="plan">입양 전 구체적으로 마련할 거예요</option></select></div>
      <fieldset style={{ border: 0, padding: 0, margin: 0 }}><legend className="ff-legend">함께 사는 사람 모두 동의했나요?</legend><div className="ff-radio-grid" style={{ marginTop: 8 }}><label className="ff-radio-card"><input type="radio" name="consent" checked={consent === "yes"} onChange={() => setConsent("yes")} /> 모두 동의</label><label className="ff-radio-card"><input type="radio" name="consent" checked={consent === "talk"} onChange={() => setConsent("talk")} /> 대화가 필요</label></div></fieldset>
      <ActionButton size="large" className="ff-action-link" onClick={() => setDone(true)}>나의 준비 살펴보기</ActionButton>
    </div>
    {done && <section className="ff-result" role="status" style={{ marginTop: 24 }}><div className="ff-kicker">참고용 준비도</div><div className="ff-score">{score}<small style={{ fontSize: 16 }}>/100</small></div><div className="ff-progress"><div style={{ width: `${score}%` }} /></div><h2 className="ff-section-title" style={{ marginTop: 20 }}>이미 잘 준비한 점</h2><p className="ff-description">돌봄 가능 시간과 비상 비용을 현실적으로 생각하고 있어요.</p><h2 className="ff-section-title" style={{ marginTop: 20 }}>준비할 점</h2><p className="ff-description">{hours > 8 ? "오래 혼자 있어도 안정적인 친구인지 보호자와 상담해 보세요." : "첫 일주일 적응 기간에 곁에 있을 계획을 세워보세요."}</p><div style={{ marginTop: 20 }}><Callout tone="informative" prefixIcon={<IconLightbulbDot5Fill />} title="점수의 의미" description="사람의 자격이나 가치를 평가하지 않으며 자동 탈락에 사용하지 않아요." /></div></section>}
  </>;
}
