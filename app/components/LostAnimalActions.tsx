"use client";

import { ActionButton } from "seed-design/ui/action-button";
import Link from "next/link";

export function LostAnimalActions() {
  return <div className="ff-sticky-actions ff-lost-sticky-actions">
    <ActionButton asChild variant="neutralWeak"><a href="tel:15770954">전화로 신고하기</a></ActionButton>
    <ActionButton asChild variant="neutralWeak"><Link href="https://www.animal.go.kr/" target="_blank" rel="noreferrer">온라인으로 신고하기</Link></ActionButton>
  </div>;
}
