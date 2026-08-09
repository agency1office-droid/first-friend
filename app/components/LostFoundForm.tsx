"use client";

import { useState } from "react";
import QRCode from "qrcode";
import { ActionButton } from "seed-design/ui/action-button";
import { Callout } from "seed-design/ui/callout";
import { Checkbox } from "seed-design/ui/checkbox";
import { SegmentedControl, SegmentedControlItem } from "seed-design/ui/segmented-control";
import { TextField, TextFieldInput, TextFieldTextarea } from "seed-design/ui/text-field";
import { IconArrowDownHorizlineLine } from "@karrotmarket/react-monochrome-icon";
import { PrefixIcon } from "@seed-design/react";

export function LostFoundForm() {
  const [kind, setKind] = useState<"lost" | "found">("lost");
  const [done, setDone] = useState<{ id: number; species: string; region: string; occurredAt: string; description: string } | null>(null);
  const [alerts, setAlerts] = useState(true);
  const [error, setError] = useState("");
  const [imageName, setImageName] = useState("");

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault(); setError(""); const form = new FormData(event.currentTarget); let imageKey = ""; const file = form.get("image");
    if (file instanceof File && file.size) { const upload = new FormData(); upload.set("file", file); const uploadResponse = await fetch("/api/uploads", { method: "POST", body: upload }); if (uploadResponse.status === 401) { window.location.href = "/signin-with-chatgpt?return_to=%2Flost-found"; return; } if (!uploadResponse.ok) { setError((await uploadResponse.json()).error); return; } imageKey = (await uploadResponse.json()).key; }
    const payload = { kind, species: String(form.get("species")), region: String(form.get("region")), occurredAt: String(form.get("occurredAt")), description: String(form.get("description")), ownershipQuestion: String(form.get("ownershipQuestion") || "발견 당시 착용하고 있던 물건은 무엇인가요?"), alertRegion: alerts ? String(form.get("region")) : "", imageKey };
    const response = await fetch("/api/lost-found", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(payload) });
    if (response.status === 401) { window.location.href = "/signin-with-chatgpt?return_to=%2Flost-found"; return; }
    if (response.ok) setDone({ id: (await response.json()).report.id, ...payload }); else setError((await response.json()).error || "접수하지 못했어요.");
  }

  async function downloadPoster() {
    if (!done) return;
    const canvas = document.createElement("canvas"); canvas.width = 1080; canvas.height = 1528; const context = canvas.getContext("2d"); if (!context) return;
    context.fillStyle = "#fff7f0"; context.fillRect(0, 0, canvas.width, canvas.height); context.fillStyle = "#ff6f0f"; context.fillRect(0, 0, canvas.width, 210); context.fillStyle = "#fff"; context.font = "700 72px sans-serif"; context.fillText(done.species + (kind === "lost" ? "를 찾습니다" : "를 발견했습니다"), 72, 132);
    context.fillStyle = "#222"; context.font = "700 44px sans-serif"; context.fillText(done.region, 72, 320); context.font = "32px sans-serif"; context.fillText(done.occurredAt.replace("T", " "), 72, 380);
    const lines = done.description.match(/.{1,25}/g) || []; lines.slice(0, 8).forEach((line, index) => context.fillText(line, 72, 500 + index * 50));
    const qr = await QRCode.toDataURL(`${location.origin}/lost-found?report=${done.id}`, { width: 320, margin: 1, color: { dark: "#222222", light: "#ffffff" } }); const image = new Image(); image.onload = () => { context.drawImage(image, 380, 1040, 320, 320); context.font = "26px sans-serif"; context.textAlign = "center"; context.fillText("QR을 열어 안전하게 제보해 주세요", 540, 1410); const link = document.createElement("a"); link.download = `퍼스트프렌드-${kind}-${done.id}.png`; link.href = canvas.toDataURL("image/png"); link.click(); }; image.src = qr;
  }

  if (done) return <div className="ff-result"><h2 className="ff-section-title">{kind === "lost" ? "실종 신고" : "발견 제보"}를 접수했어요</h2><p className="ff-description" style={{ margin: "8px 0 16px" }}>정확한 위치와 연락처는 공개되지 않습니다. 소유 확인 질문을 통과한 연결만 안내해요.</p>{alerts && <Callout tone="positive" description={`${done.region} 지역 알림 대상으로 등록했어요.`}/>}<div style={{ marginTop: 14 }}><ActionButton onClick={downloadPoster}><PrefixIcon svg={<IconArrowDownHorizlineLine/>}/>QR 전단지 저장</ActionButton></div></div>;

  return <form className="ff-form" onSubmit={submit}>
    <SegmentedControl value={kind} onValueChange={(value) => setKind(value as "lost" | "found")} aria-label="신고 종류"><SegmentedControlItem value="lost">반려동물을 찾고 있어요</SegmentedControlItem><SegmentedControlItem value="found">동물을 발견했어요</SegmentedControlItem></SegmentedControl>
    <div className="ff-field"><label htmlFor="species">동물 종류</label><select className="ff-native-select" id="species" name="species"><option>고양이</option><option>강아지</option><option>새</option><option>기타</option></select></div>
    <label className="ff-photo-drop ff-upload-compact" htmlFor="lost-image"><span>사진 선택 · 외형 매칭 정확도를 높여요</span><input id="lost-image" name="image" type="file" accept="image/jpeg,image/png,image/webp" onChange={(event) => setImageName(event.target.files?.[0]?.name || "")}/></label>{imageName && <div className="ff-meta">{imageName}</div>}
    <TextField label="대략적인 지역" description="시·구·동 수준까지만 공개해요." required><TextFieldInput name="region" placeholder="예: 서울 마포구" required/></TextField>
    <TextField label="마지막 목격 또는 발견 시각" required><TextFieldInput name="occurredAt" type="datetime-local" required/></TextField>
    <TextField label="외형과 상황" description="털색, 무늬, 크기, 착용품, 이동 방향을 적어주세요." required><TextFieldTextarea name="description" minLength={20} required/></TextField>
    {kind === "lost" && <TextField label="소유 확인 질문" description="진짜 보호자만 답할 수 있고 공개 사진에는 보이지 않는 특징을 질문하세요." required><TextFieldInput name="ownershipQuestion" placeholder="예: 목줄 안쪽에 적힌 문구는?" minLength={10} required/></TextField>}
    <Checkbox label="이 지역의 새로운 발견 제보를 알림 대상으로 등록" checked={alerts} onCheckedChange={setAlerts}/>
    <Callout tone="critical" description="발견한 동물을 무리하게 쫓거나 포획하지 마세요. 차도·공격성·부상 등 위험한 상황에서는 112 또는 관할 지자체에 먼저 도움을 요청하세요."/>
    {error && <Callout tone="critical" description={error}/>}<ActionButton size="large" className="ff-action-link">본인 확인 후 등록하기</ActionButton>
  </form>;
}
