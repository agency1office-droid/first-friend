"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { IconChevronLeftLine } from "@karrotmarket/react-monochrome-icon";
import { AnimalReportButton } from "./AnimalReportButton";
import { DETAIL_RETURN_SNAPSHOT_KEY } from "./detailReturn";
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

function HomeFeedBackButton() {
  return <button className="ff-app-back ff-detail-image-back" type="button" onClick={() => window.location.assign(readHomeFeedUrl())} aria-label="홈 목록으로 돌아가기"><IconChevronLeftLine aria-hidden /></button>;
}

export function AnimalDetailChromeBridge({ animalId }: { animalId: string }) {
  const [gallery, setGallery] = useState<Element | null>(null);

  useEffect(() => {
    const frame = window.requestAnimationFrame(() => setGallery(document.querySelector(".ff-detail-gallery")));
    return () => window.cancelAnimationFrame(frame);
  }, []);

  useEffect(() => {
    let snapshot: { href?: string; scrollY?: number } | null = null;
    try {
      snapshot = JSON.parse(window.sessionStorage.getItem(DETAIL_RETURN_SNAPSHOT_KEY) || "null");
    } catch {
      snapshot = null;
    }
    if (!snapshot || snapshot.href !== `${window.location.pathname}${window.location.search}${window.location.hash}`) return;
    window.sessionStorage.removeItem(DETAIL_RETURN_SNAPSHOT_KEY);
    const target = Math.max(0, Number(snapshot.scrollY) || 0);
    let attempts = 0;
    let frame = 0;
    const restore = () => {
      attempts += 1;
      window.scrollTo(0, target);
      if (attempts < 12) frame = window.requestAnimationFrame(restore);
    };
    frame = window.requestAnimationFrame(restore);
    return () => window.cancelAnimationFrame(frame);
  }, []);

  if (!gallery) return null;
  return <>
    {createPortal(<HomeFeedBackButton />, gallery)}
    {createPortal(<AnimalReportButton animalId={animalId} />, gallery)}
  </>;
}
