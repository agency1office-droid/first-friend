"use client";

import { NotificationBadge } from "@seed-design/react";

const sections = [
  ["info", "정보"],
  ["updates", "소식"],
  ["support", "봉사·후원"],
  ["animals", "보호동물"],
] as const;

export function ShelterSectionNav({ shelterId, active, updateCount, animalCount, supportCount }: { shelterId: string; active: string; updateCount: number; animalCount: number; supportCount: number }) {
  return <nav className="ff-shelter-section-nav" aria-label="보호소 채널 메뉴">
    {sections.map(([value, label]) => {
      const count = value === "updates" ? updateCount : value === "animals" ? animalCount : value === "support" ? supportCount : 0;
      const href = `/shelters/${encodeURIComponent(shelterId)}?tab=${value}`;
      return <a key={value} href={href} onClick={(event) => {
        if (event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
        event.preventDefault();
        window.location.replace(href);
      }} data-active={active === value} aria-current={active === value ? "page" : undefined}>
        <span>{label}</span>{count > 0 && <NotificationBadge size="large" aria-label={`${count}개`}>{count > 99 ? "99+" : count}</NotificationBadge>}
      </a>;
    })}
  </nav>;
}
