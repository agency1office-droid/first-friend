"use client";
import Link from "next/link";
import { IconBook, IconCheckmarkCalendar, IconPersonMagnifyingglass, IconTrophy, IconWindow4House } from "@karrotmarket/react-multicolor-icon";
import { OPEN_ALL_FILTERS_EVENT } from "./AllAnimalFilters";

const shortcuts = [
  { href: "/find/worldcup", label: "월드컵", icon: <IconTrophy aria-hidden/> },
  { href: "", label: "친구 찾기", icon: <IconPersonMagnifyingglass aria-hidden/> },
  { href: "/quiz/pet-knowledge", label: "상식 퀴즈", icon: <IconBook aria-hidden/> },
  { href: "/quiz/care-readiness", label: "입양 점검", icon: <IconWindow4House aria-hidden/> },
  { href: "/quiz/adoption-prep", label: "입양 준비", icon: <IconCheckmarkCalendar aria-hidden/> },
];

export function HomeShortcuts() {
  return <nav className="ff-home-shortcuts" aria-label="바로가기">
    {shortcuts.map(({ href, label, icon }) => href
      ? <Link className="ff-home-shortcut" key={label} href={href}><span className="ff-home-shortcut-icon">{icon}</span>{label}</Link>
      : <button className="ff-home-shortcut" key={label} type="button" onClick={() => window.dispatchEvent(new Event(OPEN_ALL_FILTERS_EVENT))}><span className="ff-home-shortcut-icon">{icon}</span>{label}</button>)}
  </nav>;
}
