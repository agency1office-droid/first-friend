"use client";
import { useRef, useState } from "react";
import { ActionButton } from "seed-design/ui/action-button";
import { useAppFeedback } from "./AppFeedback";

export function VolunteerButton({shelterId,shelterName,region,postId,demo=false}:{shelterId:string;shelterName:string;region:string;postId:number;demo?:boolean}) {
  const feedback = useAppFeedback(), locked = useRef(false);
  const [pending, setPending] = useState(false);
  async function apply() {
    if (locked.current) return;
    if (demo) { feedback.success("봉사 지원 화면을 확인했어요"); return; }
    locked.current = true; setPending(true);
    try {
      const response = await fetch("/api/volunteer", {method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({shelterId,shelterName,region,postId,message:"안전교육과 일정 안내를 받고 싶어요."})});
      if (response.status === 401) { location.href = `/login?return_to=${encodeURIComponent(location.pathname)}`; return; }
      const body = await response.json();
      if (response.ok) feedback.success(body.message || "봉사 지원을 접수했어요");
      else feedback.error(body.error || "봉사 지원을 접수하지 못했어요");
    } catch { feedback.error("봉사 지원을 접수하지 못했어요. 연결을 확인하고 다시 시도해 주세요."); }
    finally { locked.current = false; setPending(false); }
  }
  return <ActionButton size="small" disabled={pending} loading={pending} onClick={apply}>지원</ActionButton>;
}
