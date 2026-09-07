"use client";
import { SnackbarAvoidOverlap } from "seed-design/ui/snackbar";

import { ActionButton } from "seed-design/ui/action-button";
import { IconAndroidshareLine } from "@karrotmarket/react-monochrome-icon";
import { useAppFeedback } from "./AppFeedback";
import { FavoriteButton } from "./FavoriteButton";
import { ShelterPhoneDialog } from "./ShelterPhoneDialog";

export function LostAnimalActions({ animalId, animalName }: { animalId: string; animalName: string }) {
  const feedback = useAppFeedback();

  async function share() {
    try {
      if (navigator.share) await navigator.share({ title: `퍼스트 프렌드 · ${animalName}`, text: `${animalName} 실종 정보를 함께 확인해 주세요.`, url: location.href });
      else { await navigator.clipboard.writeText(location.href); feedback.success("공유 링크를 복사했어요"); }
    } catch { feedback.error("공유를 완료하지 못했어요"); }
  }

  return <SnackbarAvoidOverlap><div className="ff-sticky-actions ff-lost-sticky-actions">
    <FavoriteButton animalId={animalId} animalName={animalName} className="ff-sticky-scrap" />
    <button className="ff-sticky-share" type="button" onClick={share} aria-label="공유하기"><IconAndroidshareLine aria-hidden /></button>
    <ActionButton asChild variant="neutralWeak"><a href="https://www.animal.go.kr/front/awtis/loss/findFrm.do?menuNo=1000000054" target="_blank" rel="noreferrer">실종 동물 제보</a></ActionButton>
    <ShelterPhoneDialog shelter="동물보호 상담센터" phone="1577-0954" className="ff-lost-contact-trigger" ariaLabel="동물보호 상담센터 연락하기">연락하기</ShelterPhoneDialog>
  </div></SnackbarAvoidOverlap>;
}
