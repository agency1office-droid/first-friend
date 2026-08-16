"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { AppBackButton } from "./AppChrome";
import { NotificationBell } from "./NotificationBell";
import { GlobalMenuButton } from "./GlobalMenuButton";

export function AnimalDetailChromeBridge() {
  const [slots, setSlots] = useState<{ title: Element; actions: Element; gallery: Element } | null>(null);
  const [showTitle, setShowTitle] = useState(false);

  useEffect(() => {
    const update = () => {
      const heading = document.querySelector(".ff-detail-name");
      setShowTitle(Boolean(heading && heading.getBoundingClientRect().bottom <= 56));
    };
    const frame = window.requestAnimationFrame(() => {
      const title = document.querySelector(".ff-stack-topbar .ff-topbar-title");
      const actions = document.querySelector(".ff-stack-topbar .ff-topbar-side-end");
      const gallery = document.querySelector(".ff-detail-gallery");
      if (title && actions && gallery) setSlots({ title, actions, gallery });
      update();
    });
    window.addEventListener("scroll", update, { passive: true });
    return () => { window.cancelAnimationFrame(frame); window.removeEventListener("scroll", update); };
  }, []);

  if (!slots) return null;
  return <>
    {createPortal(showTitle ? name : "", slots.title)}
    {createPortal(<div className="ff-detail-topbar-actions">
      <NotificationBell />
      <GlobalMenuButton />
    </div>, slots.actions)}
    {createPortal(<AppBackButton fallback="/find" title="친구 정보" className="ff-detail-image-back" />, slots.gallery)}
  </>;
}
