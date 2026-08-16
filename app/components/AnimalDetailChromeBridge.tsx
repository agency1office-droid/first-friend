"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { AppBackButton } from "./AppChrome";
import { AnimalReportButton } from "./AnimalReportButton";

export function AnimalDetailChromeBridge({ animalId }: { animalId: string }) {
  const [gallery, setGallery] = useState<Element | null>(null);

  useEffect(() => {
    const frame = window.requestAnimationFrame(() => setGallery(document.querySelector(".ff-detail-gallery")));
    return () => window.cancelAnimationFrame(frame);
  }, []);

  if (!gallery) return null;
  return <>
    {createPortal(<AppBackButton fallback="/find" title="친구 정보" className="ff-detail-image-back" />, gallery)}
    {createPortal(<AnimalReportButton animalId={animalId} />, gallery)}
  </>;
}
