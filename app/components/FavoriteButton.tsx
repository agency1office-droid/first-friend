"use client";

import { useState } from "react";
import { IconHeartFill, IconHeartLine } from "@karrotmarket/react-monochrome-icon";
import { useAppFeedback } from "./AppFeedback";

export function FavoriteButton({ animalId, animalName }: { animalId: string; animalName: string }) {
  const [saved, setSaved] = useState(false);
  const [busy, setBusy] = useState(false);
  const feedback = useAppFeedback();
  async function toggle() { if (busy) return; setBusy(true); const response = await fetch("/api/favorites", { method: saved ? "DELETE" : "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ animalId }) }); if (response.status === 401) window.location.href = `/signin-with-chatgpt?return_to=${encodeURIComponent(location.pathname)}`; else if (response.ok) { const next=!saved; setSaved(next); feedback.success(next?"관심 친구로 저장했어요":"관심 친구에서 지웠어요",next?{actionLabel:"목록보기",onAction:()=>{location.href="/mypage/favorites"}}:undefined); } else feedback.error("관심 친구를 변경하지 못했어요"); setBusy(false); }
  return <button type="button" className="ff-card-heart" aria-pressed={saved} aria-label={`${animalName} ${saved ? "관심 친구에서 삭제" : "관심 친구로 저장"}`} onClick={toggle} disabled={busy}>{saved ? <IconHeartFill/> : <IconHeartLine/>}</button>;
}
