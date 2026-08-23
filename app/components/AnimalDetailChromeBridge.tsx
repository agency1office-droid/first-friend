"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { AppBackButton } from "./AppChrome";
import { AnimalReportButton } from "./AnimalReportButton";
import { DETAIL_RETURN_SNAPSHOT_KEY } from "./detailReturn";

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
    {createPortal(<AppBackButton fallback="/find" title="친구 정보" className="ff-detail-image-back" />, gallery)}
    {createPortal(<AnimalReportButton animalId={animalId} />, gallery)}
  </>;
}
