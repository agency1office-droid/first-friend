"use client";

import { ActionButton } from "seed-design/ui/action-button";
import {
  IconAndroidshareLine,
} from "@karrotmarket/react-monochrome-icon";
import { useAppFeedback } from "./AppFeedback";
import { FavoriteButton } from "./FavoriteButton";

export function AnimalActions({
  animalId,
  name,
  shelterPhone,
}: {
  animalId: string;
  name: string;
  shelterPhone?: string;
}) {
  const feedback = useAppFeedback();

  async function share() {
    const data = {
      title: `퍼스트 프렌드 · ${name}`,
      text: `${name} 친구를 우리 가족과 함께 살펴봐요.`,
      url: location.href,
    };
    try {
      if (navigator.share) await navigator.share(data);
      else {
        await navigator.clipboard.writeText(location.href);
        feedback.success("공유 링크를 복사했어요");
      }
    } catch {
      feedback.error("공유를 완료하지 못했어요");
    }
  }

  const inquiryHref = shelterPhone
    ? `tel:${shelterPhone.replace(/[^0-9+]/g, "")}`
    : "#shelter-contact";

  return <div className="ff-sticky-actions">
    <FavoriteButton animalId={animalId} animalName={name} className="ff-sticky-scrap" />
    <button className="ff-sticky-share" type="button" onClick={share} aria-label="공유하기"><IconAndroidshareLine aria-hidden /></button>
    <ActionButton asChild variant="neutralWeak"><a href="/pet-cost-calculator">돌봄 계산기</a></ActionButton>
    <ActionButton asChild><a href={inquiryHref}>연락하기</a></ActionButton>
  </div>;
}
