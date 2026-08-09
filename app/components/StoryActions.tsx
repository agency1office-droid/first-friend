"use client";

import { useState } from "react";
import { ActionButton } from "seed-design/ui/action-button";
import { IconExclamationmarkCircleLine as IconSirenLine, IconHeartFill, IconHeartLine } from "@karrotmarket/react-monochrome-icon";
import { PrefixIcon } from "@seed-design/react";

export function StoryActions({ postId, initialCount = 0 }: { postId?: number; initialCount?: number }) {
  const [active, setActive] = useState(false), [count, setCount] = useState(initialCount), [reported, setReported] = useState(false);
  async function react() { if (!postId) { setActive(!active); setCount((value) => Math.max(0, value + (active ? -1 : 1))); return; } const response = await fetch("/api/reactions", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ postId, reaction: "cheer" }) }); if (response.status === 401) { window.location.href = `/signin-with-chatgpt?return_to=${encodeURIComponent(location.pathname)}`; return; } if (response.ok) { const result = await response.json(); setActive(result.active); setCount((value) => Math.max(0, value + (result.active ? 1 : -1))); } }
  async function report() { if (!postId || reported) return; const reason = window.prompt("신고 사유를 적어주세요. 운영자가 검토하며 신고만으로 영구 제재하지 않습니다."); if (!reason) return; const response = await fetch("/api/reports", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ targetType: "post", targetId: String(postId), reason }) }); if (response.status === 401) window.location.href = `/signin-with-chatgpt?return_to=${encodeURIComponent(location.pathname)}`; else if (response.ok) setReported(true); }
  return <div className="ff-story-actions"><ActionButton variant={active ? "brandWeak" : "neutralWeak"} size="small" onClick={react}><PrefixIcon svg={active ? <IconHeartFill/> : <IconHeartLine/>}/>응원 {count}</ActionButton>{postId && <ActionButton variant="neutralWeak" size="small" onClick={report} disabled={reported}><PrefixIcon svg={<IconSirenLine/>}/>{reported ? "접수됨" : "신고"}</ActionButton>}</div>;
}
