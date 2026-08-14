"use client";

import { useState } from "react";
import { ActionButton } from "seed-design/ui/action-button";
import {
  BottomSheetBody,
  BottomSheetContent,
  BottomSheetFooter,
  BottomSheetRoot,
  BottomSheetTrigger,
} from "seed-design/ui/bottom-sheet";
import { Callout } from "seed-design/ui/callout";
import { TextField, TextFieldInput } from "seed-design/ui/text-field";
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
  const [shareUrl, setShareUrl] = useState("");
  const feedback = useAppFeedback();

  async function discuss() {
    const response = await fetch("/api/family", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        animalId,
        title: `${name}, 우리 가족과 함께 살 수 있을까요?`,
      }),
    });
    if (response.status === 401) {
      location.href = `/login?return_to=${encodeURIComponent(location.pathname)}`;
      return;
    }
    const body = await response.json();
    if (response.ok) {
      setShareUrl(`${location.origin}${body.href}`);
      feedback.success("가족 상의방을 만들었어요");
    } else feedback.error(body.error || "가족 상의방을 만들지 못했어요");
  }

  async function copyFamilyLink() {
    await navigator.clipboard.writeText(shareUrl);
    feedback.success("가족 상의 링크를 복사했어요");
  }

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
    <BottomSheetRoot>
      <BottomSheetTrigger asChild>
        <ActionButton variant="neutralWeak">질문하기</ActionButton>
      </BottomSheetTrigger>
      <BottomSheetContent title={`${name}에 대해 함께 상의해요`} description="가족 카톡방에 링크 하나만 보내면 로그인 없이 각자 의견을 남길 수 있어요.">
        <BottomSheetBody>
          <Callout tone="informative" description="정확한 주소나 개인 연락처 없이 공개된 동물 정보만 공유합니다." />
          {shareUrl ? <>
            <TextField label="가족 상의 링크"><TextFieldInput readOnly value={shareUrl} /></TextField>
            <ActionButton onClick={copyFamilyLink}>링크 복사</ActionButton>
          </> : <ActionButton size="large" className="ff-action-link" onClick={discuss}>가족 상의방 만들기</ActionButton>}
        </BottomSheetBody>
        <BottomSheetFooter><ActionButton variant="neutralWeak" onClick={share}>일반 공유</ActionButton></BottomSheetFooter>
      </BottomSheetContent>
    </BottomSheetRoot>
    <ActionButton asChild><a href={inquiryHref}>연락하기</a></ActionButton>
  </div>;
}
