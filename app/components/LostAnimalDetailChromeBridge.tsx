"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { IconChevronLeftLine } from "@karrotmarket/react-monochrome-icon";

export function LostAnimalDetailChromeBridge() {
  const [gallery, setGallery] = useState<Element | null>(null);

  useEffect(() => {
    const frame = window.requestAnimationFrame(() => setGallery(document.querySelector(".ff-detail-gallery")));
    return () => window.cancelAnimationFrame(frame);
  }, []);

  if (!gallery) return null;
  return createPortal(
    <button className="ff-app-back ff-detail-image-back" type="button" onClick={() => window.location.assign("/lost-found/animals")} aria-label="실종 동물 목록으로 돌아가기">
      <IconChevronLeftLine aria-hidden />
    </button>,
    gallery,
  );
}
