"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { IconChevronLeftLine } from "@karrotmarket/react-monochrome-icon";
import { HOME_FEED_SNAPSHOT_KEY } from "./homeFeedSnapshot";

function readHomeFeedUrl() {
  try {
    const snapshot = JSON.parse(window.sessionStorage.getItem(HOME_FEED_SNAPSHOT_KEY) || "null") as { url?: unknown } | null;
    const url = typeof snapshot?.url === "string" ? snapshot.url : "";
    return url.startsWith("/") && !url.startsWith("//") && new URL(url, window.location.origin).pathname === "/" ? url : "/";
  } catch {
    return "/";
  }
}

export function LostAnimalDetailChromeBridge() {
  const [gallery, setGallery] = useState<Element | null>(null);

  useEffect(() => {
    const frame = window.requestAnimationFrame(() => setGallery(document.querySelector(".ff-detail-gallery")));
    return () => window.cancelAnimationFrame(frame);
  }, []);

  if (!gallery) return null;
  return createPortal(
    <button className="ff-app-back ff-detail-image-back" type="button" onClick={() => window.location.assign(readHomeFeedUrl())} aria-label="홈 목록으로 돌아가기">
      <IconChevronLeftLine aria-hidden />
    </button>,
    gallery,
  );
}
