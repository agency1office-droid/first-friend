"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { IconAndroidshareLine } from "@karrotmarket/react-monochrome-icon";
import { FavoriteButton } from "./FavoriteButton";
import { useAppFeedback } from "./AppFeedback";

export function AnimalDetailChromeBridge({ animalId, name }: { animalId: string; name: string }) {
  const [slots, setSlots] = useState<{ title: Element; actions: Element } | null>(null);
  const [showTitle, setShowTitle] = useState(false);
  const feedback = useAppFeedback();

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

  async function share() {
    const data = { title: `퍼스트 프렌드 · ${name}`, text: `${name} 친구를 함께 살펴봐요.`, url: location.href };
    try {
      if (navigator.share) await navigator.share(data);
      else { await navigator.clipboard.writeText(location.href); feedback.success("공유 링크를 복사했어요"); }
    } catch (error) {
      if ((error as DOMException)?.name !== "AbortError") feedback.error("공유를 완료하지 못했어요");
    }
  }

  if (!slots) return null;
  return <>
    {createPortal(showTitle ? name : "", slots.title)}
    {createPortal(<div className="ff-detail-topbar-actions">
      <button className="ff-icon-link" type="button" onClick={share} aria-label={`${name} 공유`}><IconAndroidshareLine aria-hidden /></button>
      <FavoriteButton animalId={animalId} animalName={name}/>
    </div>, slots.actions)}
  </>;
}
