"use client";
import { useEffect, useState } from "react";
import { ActionButton } from "seed-design/ui/action-button";
import { Callout } from "seed-design/ui/callout";
import { TextField, TextFieldInput } from "seed-design/ui/text-field";
import { sanitizeImageFile } from "../../lib/client-image";

type VerificationRequest = { status:string; createdAt:string };

export function VerificationForm() {
  const [requests, setRequests] = useState<VerificationRequest[]>([]), [error, setError] = useState(""), [done, setDone] = useState(false),[role,setRole]=useState("foster");
  useEffect(() => { fetch("/api/verification").then(r => r.json()).then(v => setRequests(v.requests || [])); }, []);

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault(); setError("");
    const form = new FormData(event.currentTarget), file = form.get("evidence");
    if (!(file instanceof File) || !file.size) return setError("확인 자료 이미지를 선택해 주세요.");
    const safe = await sanitizeImageFile(file), upload = new FormData(); upload.set("file", safe); upload.set("purpose", "role-verification");
    const uploaded = await fetch("/api/uploads", { method:"POST", body:upload });
    if (uploaded.status === 401) { location.href = "/login?return_to=%2Fverification"; return; }
    if (!uploaded.ok) return setError((await uploaded.json()).error);
    const response = await fetch("/api/verification", { method:"POST", headers:{"content-type":"application/json"}, body:JSON.stringify({ requestedRole:form.get("role"), organization:form.get("organization"),representativeName:form.get("representativeName"),businessNumber:form.get("businessNumber"),shelterType:form.get("shelterType"), evidenceKey:(await uploaded.json()).key }) });
    if (response.ok) setDone(true); else setError((await response.json()).error);
  }

  if (done) return <Callout tone="positive" title="인증 검토를 요청했어요" description="자료는 공개되지 않으며 운영자가 확인한 뒤 역할과 만료일을 알려드립니다."/>;
  return <><Callout tone="informative" title="인증 자료는 공개하지 않습니다" description="신원·활동·수의사 면허 증빙은 비공개 저장되며 심사 목적 외에는 사용하지 않습니다. 주민등록번호 전체가 보이는 자료는 올리지 마세요."/>{requests[0]&&<p className="ff-meta">최근 요청: {requests[0].status} · {requests[0].createdAt}</p>}<form className="ff-form" onSubmit={submit}><div className="ff-field"><label htmlFor="verify-role">신청 역할</label><select id="verify-role" name="role" className="ff-native-select" value={role} onChange={event=>setRole(event.target.value)}><option value="foster">개인 임시보호자</option><option value="shelter">보호단체·보호센터</option><option value="veterinarian">수의사 전문가</option></select></div><TextField label={role==="shelter"?"단체·보호소 이름":role==="veterinarian"?"소속 동물병원":"활동명"}><TextFieldInput name="organization" required={role==="shelter"}/></TextField>{(role==="shelter"||role==="veterinarian")&&<><div className="ff-field"><label htmlFor="shelter-type">운영 유형</label><select id="shelter-type" name="shelterType" className="ff-native-select" required><option value="공공 보호센터">공공 보호센터</option><option value="등록 민간 보호소">등록 민간 보호소</option><option value="비영리 보호단체">비영리 보호단체</option></select></div><TextField label="대표자 이름"><TextFieldInput name="representativeName" required/></TextField><TextField label="사업자·법인·동물보호시설 등록번호"><TextFieldInput name="businessNumber" required/></TextField></>}<label className="ff-photo-drop ff-upload-compact"><span>{role==="shelter"?"등록증·재직·대표자 확인 자료 선택":role==="veterinarian"?"수의사 면허·재직 확인 자료 선택":"본인·구조 활동 확인 자료 선택"}</span><input name="evidence" type="file" accept="image/jpeg,image/png,image/webp"/></label>{error&&<Callout tone="critical" description={error}/>}<ActionButton size="large">비공개 검토 요청</ActionButton></form></>;
}

