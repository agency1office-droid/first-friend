"use client";
import { useRef, useState } from "react";
import { ActionButton } from "seed-design/ui/action-button";
import { useAppFeedback } from "./AppFeedback";

export function SupportIntentButton({kind,title,targetId,amount=0,label,demo=false,size="medium"}:{kind:"operations"|"goods"|"shelter_item"|"affiliate"|"insurance_referral";title:string;targetId:string;amount?:number;label:string;demo?:boolean;size?:"small"|"medium"}) {
  const feedback = useAppFeedback(), locked = useRef(false);
  const [pending, setPending] = useState(false);
  async function act() {
    if (locked.current) return;
    if (demo) { feedback.success("후원 의향 화면을 확인했어요"); return; }
    locked.current = true; setPending(true);
    try {
      const response = await fetch("/api/support", {method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({kind,title,targetId,amount})});
      if (response.status === 401) { location.href = `/login?return_to=${encodeURIComponent(location.pathname)}`; return; }
      const body = await response.json();
      if (response.ok) feedback.success("관심 의사를 기록했어요");
      else feedback.error(body.error || "요청을 기록하지 못했어요");
    } catch { feedback.error("요청을 기록하지 못했어요. 연결을 확인하고 다시 시도해 주세요."); }
    finally { locked.current = false; setPending(false); }
  }
  return <ActionButton size={size} disabled={pending} loading={pending} onClick={act}>{label}</ActionButton>;
}
