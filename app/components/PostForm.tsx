/* eslint-disable @next/next/no-html-link-for-pages */
"use client";

import { useState } from "react";
import { ActionButton } from "seed-design/ui/action-button";
import { TextField, TextFieldInput, TextFieldTextarea } from "seed-design/ui/text-field";
import { Callout } from "seed-design/ui/callout";
import { Checkbox } from "seed-design/ui/checkbox";

export function PostForm() {
  const [done, setDone] = useState(false), [publicConfirmed, setPublicConfirmed] = useState(false), [error, setError] = useState(""), [imageName, setImageName] = useState("");
  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault(); setError(""); if (!publicConfirmed) { setError("전체 공개와 개인정보 안내를 확인해 주세요."); return; }
    const form = new FormData(event.currentTarget); let imageKey = ""; const file = form.get("image");
    if (file instanceof File && file.size) { const upload = new FormData(); upload.set("file", file); const uploadResponse = await fetch("/api/uploads", { method: "POST", body: upload }); if (uploadResponse.status === 401) { window.location.href = "/signin-with-chatgpt?return_to=%2Fstories%2Fnew"; return; } if (!uploadResponse.ok) { setError((await uploadResponse.json()).error); return; } imageKey = (await uploadResponse.json()).key; }
    const response = await fetch("/api/posts", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ category: form.get("category"), title: form.get("title"), body: form.get("body"), imageKey }) });
    if (response.status === 401) { window.location.href = "/signin-with-chatgpt?return_to=%2Fstories%2Fnew"; return; }
    if (response.ok) setDone(true); else setError((await response.json()).error || "공개하지 못했어요.");
  }
  if (done) return <div className="ff-result"><h2 className="ff-section-title">이야기를 공개했어요</h2><p className="ff-description" style={{ margin: "8px 0 16px" }}>댓글은 없고 공감과 응원만 받을 수 있어요. 언제든 나의 페이지에서 수정·삭제할 수 있습니다.</p><ActionButton asChild variant="neutralSolid"><a href="/stories">이야기 보기</a></ActionButton></div>;
  return <form className="ff-form" onSubmit={submit}><Callout tone="warning" title="모든 글은 전체 공개됩니다" description="검색엔진과 공유 미리보기에 나타날 수 있어요. 정확한 위치, 급식 장소, 전화번호, 집 주소는 적지 마세요."/><div className="ff-field"><label htmlFor="category">이야기 종류</label><select className="ff-native-select" id="category" name="category"><option value="memory">오늘의 추억</option><option value="neighborhood">동네 친구</option><option value="adoption">입양 일기 · 인증 입양자</option><option value="rescue">보호 이야기 · 인증 보호자</option></select></div><label className="ff-photo-drop ff-upload-compact" htmlFor="post-image"><span>대표 사진 선택 · 최대 8MB</span><input id="post-image" name="image" type="file" accept="image/jpeg,image/png,image/webp" onChange={(event) => setImageName(event.target.files?.[0]?.name || "")}/></label>{imageName && <div className="ff-meta">{imageName}</div>}<TextField label="제목" required maxGraphemeCount={80}><TextFieldInput name="title" required/></TextField><TextField label="이야기" required maxGraphemeCount={4000}><TextFieldTextarea name="body" required minLength={20}/></TextField><Checkbox label="전체 공개와 개인정보·동물 위치 보호 안내를 확인했습니다" checked={publicConfirmed} onCheckedChange={setPublicConfirmed}/>{error && <Callout tone="critical" description={error}/>}<ActionButton size="large" className="ff-action-link">본인 확인 후 공개하기</ActionButton></form>;
}
