"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { AppBackButton } from "./AppChrome";
export function LostAnimalDetailChromeBridge() {
  const [gallery, setGallery] = useState<Element | null>(null);

  useEffect(() => {
    const frame = window.requestAnimationFrame(() => setGallery(document.querySelector(".ff-detail-gallery")));
    return () => window.cancelAnimationFrame(frame);
  }, []);

  if (!gallery) return null;
  return createPortal(
    <AppBackButton fallback="/lost-found/animals" title="실종 동물 상세" className="ff-detail-image-back" />,
    gallery,
  );
}
