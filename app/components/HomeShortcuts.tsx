"use client";
import Link from "next/link";
import { useSyncExternalStore } from "react";
import { IconBook, IconCheckmarkCalendar, IconPersonMagnifyingglass, IconTrophy, IconWindow4House } from "@karrotmarket/react-multicolor-icon";
import { OPEN_ALL_FILTERS_EVENT } from "./AllAnimalFilters";

// PC에서는 바로가기를 새 창으로 엽니다(상세→퀴즈 흐름 openDetailFlow와 같은 기준: 767px 이하는 모바일). 모바일은 지금처럼 같은 화면에서 이동합니다.
// 서버 렌더에서는 false라 hydration이 어긋나지 않고, 마운트 뒤 실제 창 크기에 맞춰 다시 그려집니다.
const mobileMedia = () => window.matchMedia("(max-width: 767px)");
const subscribeMobileMedia = (onChange: () => void) => { const media = mobileMedia(); media.addEventListener("change", onChange); return () => media.removeEventListener("change", onChange); };
const useOpensNewWindow = () => useSyncExternalStore(subscribeMobileMedia, () => !mobileMedia().matches, () => false);

const shortcuts = [
  { href: "/find/worldcup", label: "월드컵", icon: <IconTrophy aria-hidden/> },
  { href: "", label: "친구 찾기", icon: <IconPersonMagnifyingglass aria-hidden/> },
  { href: "/quiz/pet-knowledge", label: "상식 퀴즈", icon: <IconBook aria-hidden/> },
  { href: "/quiz/care-readiness", label: "입양 점검", icon: <IconWindow4House aria-hidden/> },
  { href: "/quiz/adoption-prep", label: "입양 준비", icon: <IconCheckmarkCalendar aria-hidden/> },
];

export function HomeShortcuts() {
  const newWindow = useOpensNewWindow();
  return <nav className="ff-home-shortcuts" aria-label="바로가기">
    {shortcuts.map(({ href, label, icon }) => href
      ? <Link className="ff-home-shortcut" key={label} href={href} target={newWindow ? "_blank" : undefined} rel={newWindow ? "noopener noreferrer" : undefined}><span className="ff-home-shortcut-icon">{icon}</span>{label}</Link>
      : <button className="ff-home-shortcut" key={label} type="button" onClick={() => window.dispatchEvent(new Event(OPEN_ALL_FILTERS_EVENT))}><span className="ff-home-shortcut-icon">{icon}</span>{label}</button>)}
  </nav>;
}
