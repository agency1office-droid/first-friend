"use client";

import { useEffect, useState } from "react";
import { IconAndroidshareLine, IconBellLine, IconChevronRightLine, IconClockLine, IconMapLocationpinLine, IconPhoneLine, IconQUppercaseChatbubbleRightLine } from "@karrotmarket/react-monochrome-icon";
import { useAppFeedback } from "./AppFeedback";
import { BottomSheetBody, BottomSheetContent, BottomSheetRoot, BottomSheetTrigger } from "seed-design/ui/bottom-sheet";

export function ShelterChannelActions({ shelterId, name, phone, mapHref, infoHref }: { shelterId: string; name: string; phone: string; mapHref: string; infoHref: string }) {
  const [following, setFollowing] = useState(false), [busy, setBusy] = useState(false), [followReady, setFollowReady] = useState(false);
  const feedback = useAppFeedback();
  const phoneNumber = phone.replace(/[^\d+]/g, ""), hasPhone = phoneNumber.replace(/\D/g, "").length >= 7;
  useEffect(() => { void fetch(`/api/shelter-follows?shelterId=${encodeURIComponent(shelterId)}`).then(response => response.ok ? response.json() : { following: false }).then(body => setFollowing(Boolean(body.following))).catch(() => undefined).finally(() => setFollowReady(true)); }, [shelterId]);
  async function toggleFollow() {
    setBusy(true);
    const response = await fetch("/api/shelter-follows", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ shelterId }) });
    if (response.status === 401) location.href = `/login?return_to=${encodeURIComponent(location.pathname)}`;
    else if (response.ok) { const body = await response.json(); setFollowing(body.following); feedback.success(body.following ? "이 보호소의 새 소식을 알려드릴게요" : "보호소 소식 알림을 껐어요"); }
    else feedback.error("소식 알림을 변경하지 못했어요");
    setBusy(false);
  }
  async function share() {
    try { if (navigator.share) await navigator.share({ title: `퍼스트 프렌드 · ${name}`, text: `${name}에서 보호 중인 친구와 소식을 함께 봐요.`, url: location.href }); else { await navigator.clipboard.writeText(location.href); feedback.success("보호소 링크를 복사했어요"); } }
    catch (error) { if ((error as DOMException)?.name !== "AbortError") feedback.error("공유를 완료하지 못했어요"); }
  }
  return <div className="ff-shelter-channel-actions">
    <BottomSheetRoot>
      <BottomSheetTrigger asChild><button className="ff-shelter-action" type="button"><IconQUppercaseChatbubbleRightLine aria-hidden/><span>문의하기</span></button></BottomSheetTrigger>
      <BottomSheetContent title="보호소에 문의하기" description="방문이나 입양 상담 전 운영시간과 상담 가능 여부를 확인해 주세요.">
        <BottomSheetBody><nav className="ff-shelter-inquiry-menu" aria-label="보호소 문의 방법">
          {hasPhone ? <a href={`tel:${phoneNumber}`}><IconPhoneLine aria-hidden/><span><strong>전화 문의</strong><small>{phone}</small></span><IconChevronRightLine aria-hidden/></a> : <div aria-disabled="true"><IconPhoneLine aria-hidden/><span><strong>전화번호 확인 중</strong><small>보호소 정보에서 최신 연락처를 확인해 주세요.</small></span></div>}
          <a href={infoHref}><IconClockLine aria-hidden/><span><strong>운영 정보 확인</strong><small>주소·운영시간·휴무일을 확인해요.</small></span><IconChevronRightLine aria-hidden/></a>
        </nav></BottomSheetBody>
      </BottomSheetContent>
    </BottomSheetRoot>
    <a className="ff-shelter-action" href={mapHref} target="_blank" rel="noreferrer"><IconMapLocationpinLine aria-hidden/><span>길찾기</span></a>
    <button className="ff-shelter-action" type="button" onClick={toggleFollow} disabled={busy || !followReady} data-active={following} aria-pressed={following} aria-busy={busy || !followReady}><IconBellLine aria-hidden/><span>{following ? "소식 받는 중" : "소식 받기"}</span></button>
    <button className="ff-shelter-action" type="button" onClick={share}><IconAndroidshareLine aria-hidden/><span>공유</span></button>
  </div>;
}
