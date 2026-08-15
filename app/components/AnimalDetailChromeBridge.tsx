"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { NotificationBell } from "./NotificationBell";
import { GlobalMenuButton } from "./GlobalMenuButton";

export function AnimalDetailChromeBridge() {
  const [slots, setSlots] = useState<{ title: Element; actions: Element } | null>(null);
  const [showTitle, setShowTitle] = useState(false);

  useEffect(() => {
    const update = () => {
      const heading = document.querySelector(".ff-detail-name");
      setShowTitle(Boolean(heading && heading.getBoundingClientRect().bottom <= 56));
    };
    const frame = window.requestAnimationFrame(() => {
      const title = document.querySelector(".ff-stack-topbar .ff-topbar-title");
      const actions = document.querySelector(".ff-stack-topbar .ff-topbar-side-end");
      if (title && actions) setSlots({ title, actions });
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
  </>;
}
