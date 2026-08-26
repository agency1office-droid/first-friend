"use client";

import { ActionButton } from "seed-design/ui/action-button";
import Link from "next/link";

export function LostAnimalActions() {
  return <div className="ff-sticky-actions ff-lost-sticky-actions">
    <ActionButton asChild variant="neutralWeak"><a href="tel:15770954">전화로 신고하기</a></ActionButton>
    <ActionButton asChild variant="neutralWeak"><Link href="https://www.animal.go.kr/front/awtis/loss/findFrm.do?menuNo=1000000054" target="_blank" rel="noreferrer">신고게시판</Link></ActionButton>
  </div>;
}
