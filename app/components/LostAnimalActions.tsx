"use client";

import { ActionButton } from "seed-design/ui/action-button";
import { IconAndroidshareLine } from "@karrotmarket/react-monochrome-icon";
import Link from "next/link";
import { useAppFeedback } from "./AppFeedback";

export function LostAnimalActions({ name }: { name: string }) {
  const feedback = useAppFeedback();

  async function share() {
    try {
      if (navigator.share) await navigator.share({ title: `퍼스트 프렌드 · ${name}`, text: `${name} 실종 동물 정보를 확인해 주세요.`, url: location.href });
      else { await navigator.clipboard.writeText(location.href); feedback.success("공유 링크를 복사했어요"); }
    } catch { feedback.error("공유를 완료하지 못했어요"); }
  }

  return <div className="ff-sticky-actions ff-lost-sticky-actions">
    <button className="ff-sticky-share" type="button" onClick={share} aria-label="공유하기"><IconAndroidshareLine aria-hidden /></button>
    <ActionButton asChild><Link href="/lost-found">실종·발견 제보하기</Link></ActionButton>
  </div>;
}
