"use client";

import { useEffect, useState } from "react";
import { ActionButton } from "seed-design/ui/action-button";
import { Callout } from "seed-design/ui/callout";
import { Checkbox, CheckboxGroup } from "seed-design/ui/checkbox";
import { TextField, TextFieldTextarea } from "seed-design/ui/text-field";
import { List, ListDivider, ListItem } from "seed-design/ui/list";
import { IconClockLine, IconDocumentLine, IconCheckmarkChatbubbleLeftLine } from "@karrotmarket/react-monochrome-icon";

type Assessment = { id: number; readinessScore: number; educationScore: number; passed: boolean };

export function ApplicationForm({ animalId, animalName }: { animalId: string; animalName: string }) {
  const [assessment, setAssessment] = useState<Assessment | null | undefined>(undefined);
  const [agreements, setAgreements] = useState<string[]>([]);
  const [sent, setSent] = useState<{ id: number; channelStatus: "delivered" | "awaiting_onboarding" | "direct_contact"; contact?: { shelter: string; phone: string; address: string; organization: string } | null } | null>(null);
  const [error, setError] = useState("");

  useEffect(() => { fetch("/api/readiness").then(async (response) => response.ok ? (await response.json()).assessment : null).then(setAssessment).catch(() => setAssessment(null)); }, []);

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault(); setError("");
    if (agreements.length < 4) { setError("필수 동의를 모두 확인해 주세요."); return; }
    const form = new FormData(event.currentTarget);
    const response = await fetch("/api/applications", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ animalId, household: form.get("household"), carePlan: form.get("carePlan"), absencePlan: form.get("absencePlan"), emergencyPlan: form.get("emergencyPlan"), agreementAccepted: true }) });
    if (response.ok) { const result = await response.json(); setSent({ id: result.application.id, contact: result.contact, channelStatus: result.channelStatus }); }
    else if (response.status === 401) window.location.href = `/login?return_to=${encodeURIComponent(`/apply/${animalId}`)}`;
    else if (response.status === 412) setAssessment(null);
    else setError((await response.json().catch(() => null))?.error || "신청을 저장하지 못했어요.");
  }

  if (assessment === undefined) return <div className="ff-empty">입양 준비 결과를 확인하고 있어요.</div>;
  if (!assessment?.passed) return <section className="ff-form"><Callout tone="warning" title="입양 준비 시험을 먼저 완료해 주세요" description="생활 환경과 비용을 확인하고 고양이·강아지별 필수 시험에서 80점 이상을 받으면 신청서를 작성할 수 있어요."/><ActionButton asChild size="large" className="ff-action-link"><a href={`/readiness?return_to=${encodeURIComponent(`/apply/${animalId}`)}`}>준비 시험 시작하기</a></ActionButton></section>;

  if (sent) return <div className="ff-result">
    <div className="ff-kicker">신청 #{sent.id}</div><h2 className="ff-section-title">{animalName}의 보호자에게 마음이 전달됐어요</h2><p className="ff-description" style={{ margin: "8px 0 16px" }}>신청 순서가 입양을 결정하지 않습니다. 보호자가 모든 신청을 확인하고 상담을 시작해요.</p>
    <List><ListItem prefix={<IconDocumentLine/>} title="신청서 접수" detail="지금 단계예요"/><ListDivider/><ListItem prefix={<IconCheckmarkChatbubbleLeftLine/>} title="보호자 검토와 플랫폼 상담" detail="연락처를 공개하지 않고 대화해요"/><ListDivider/><ListItem prefix={<IconClockLine/>} title="동의서·안전 인계 예약" detail="승인 후 날짜와 이동 방법을 정해요"/></List>
    {sent.channelStatus === "delivered" && <Callout tone="positive" title="입점 보호소 관리자 신청함에 전달했어요" description="보호소 담당자는 지원자 준비도와 적합도, 상담 기록을 한 화면에서 확인할 수 있어요."/>}
    {sent.channelStatus === "awaiting_onboarding" && <Callout tone="warning" title="보호소 채널 대기함에 안전하게 보관했어요" description="해당 보호소가 채널을 연결하면 기존 신청도 관리자 신청함으로 자동 인계됩니다. 현재 보호 여부는 아래 공식 연락처로 먼저 확인해 주세요."/>}
    {sent.contact && <div className="ff-contact-card"><div className="ff-kicker">공식 보호센터 연락</div><strong>{sent.contact.shelter}</strong><p>{sent.contact.organization}<br/>{sent.contact.address}</p><ActionButton asChild><a href={`tel:${sent.contact.phone.replace(/[^\d+]/g, "")}`}>{sent.contact.phone || "보호센터 전화하기"}</a></ActionButton><p className="ff-meta">전화할 때 퍼스트 프렌드 신청 번호와 공고번호를 함께 말하면 확인이 쉬워요. 연락처는 공공데이터의 최신 값이며 방문 전 운영시간을 다시 확인해 주세요.</p></div>}
    <div style={{ marginTop: 16 }}><ActionButton asChild variant="neutralSolid" className="ff-action-link"><a href="/mypage">진행 상황 보기</a></ActionButton></div>
  </div>;

  return <form className="ff-form" onSubmit={submit}>
    <Callout tone="positive" title={`준비도 ${assessment.readinessScore}점 · 시험 ${assessment.educationScore}점`} description="이 결과는 신청자를 자동 탈락시키지 않으며 보호자의 상담 참고 자료로만 전달됩니다."/>
    <TextField label="함께 사는 환경" description="주거 형태, 동거인, 기존 반려동물, 평일 생활 리듬을 구체적으로 적어주세요." required><TextFieldTextarea name="household" required minLength={30}/></TextField>
    <TextField label="매일의 돌봄 계획" description="급여, 놀이·산책, 배변·청소, 첫 적응 기간을 어떻게 돌볼지 적어주세요." required><TextFieldTextarea name="carePlan" required minLength={30}/></TextField>
    <TextField label="부재·여행 계획" description="평일 부재 시간과 출장·여행 시 맡길 사람 또는 시설을 적어주세요." required><TextFieldTextarea name="absencePlan" required minLength={20}/></TextField>
    <TextField label="질병·응급 상황 계획" description="이용할 병원, 이동 방법, 비상자금과 의사결정자를 적어주세요." required><TextFieldTextarea name="emergencyPlan" required minLength={20}/></TextField>
    <CheckboxGroup label="안전 입양 사전 동의" description="최종 승인 후 표준 안전 입양 동의서에 다시 전자 동의합니다.">
      {["작성한 정보가 사실임을 확인합니다.", "동물을 판매·재유기·무단 재분양하지 않습니다.", "최종 승인 권한이 보호센터·임시보호자에게 있음을 이해합니다.", "입양 후 포스트와 안부 기록은 자발적임을 이해합니다."].map((label) => <Checkbox key={label} label={label} checked={agreements.includes(label)} onCheckedChange={(checked) => setAgreements((current) => checked ? [...current, label] : current.filter((item) => item !== label))}/>) }
    </CheckboxGroup>
    {error && <Callout tone="critical" description={error}/>}<ActionButton size="large" className="ff-action-link">본인 확인 후 신청하기</ActionButton>
  </form>;
}
