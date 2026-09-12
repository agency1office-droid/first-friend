"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import { IconCheckmarkClipboardLine, IconHeartLine, IconHospitalcrossBuildingLine, IconHousePlusLine, IconMagnifyingglassLine } from "@karrotmarket/react-monochrome-icon";

const shortcuts = [
  { href: "/lost-found/animals", label: "실종 동물", icon: <IconMagnifyingglassLine aria-hidden/> },
  { href: "/shelters", label: "보호소", icon: <IconHospitalcrossBuildingLine aria-hidden/> },
  { href: "/readiness", label: "입양 준비", icon: <IconCheckmarkClipboardLine aria-hidden/> },
  { href: "/foster", label: "임시 보호", icon: <IconHousePlusLine aria-hidden/> },
  { href: "/support", label: "후원하기", icon: <IconHeartLine aria-hidden/> },
];

export function HomeShortcuts() {
  const [opened, setOpened] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 40);
    onScroll();
    const frame = window.requestAnimationFrame(() => setOpened(true));
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => { window.cancelAnimationFrame(frame); window.removeEventListener("scroll", onScroll); };
  }, []);
  return <nav className="ff-home-shortcuts" data-compact={!opened || scrolled || undefined} aria-label="바로가기">
    {shortcuts.map(({ href, label, icon }) => <Link className="ff-home-shortcut" key={href} href={href}>
      <span className="ff-home-shortcut-icon">{icon}</span>{label}
    </Link>)}
  </nav>;
}
