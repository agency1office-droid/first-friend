"use client";

import { useEffect, useState } from "react";
import { Bookmark } from "lucide-react";
import { useAppFeedback } from "./AppFeedback";

let favoriteIds: Set<string> | null = null;
let favoriteIdsRequest: Promise<Set<string>> | null = null;

function loadFavoriteIds() {
  if (favoriteIds) return Promise.resolve(favoriteIds);
  if (!favoriteIdsRequest) favoriteIdsRequest = fetch("/api/favorites")
    .then(async response => {
      if (!response.ok) throw new Error("관심 친구 목록을 불러오지 못했어요.");
      const body = await response.json() as { favorites?: { animalId?: string }[] };
      return new Set((body.favorites || []).map(item => item.animalId || "").filter(Boolean));
    })
    .then(ids => { favoriteIds = ids; return ids; })
    .finally(() => { favoriteIdsRequest = null; });
  return favoriteIdsRequest;
}

export function FavoriteButton({ animalId, animalName, initialSaved, onFavoriteChange }: { animalId: string; animalName: string; initialSaved?: boolean; onFavoriteChange?: (saved: boolean) => void }) {
  const [saved, setSaved] = useState(initialSaved ?? false);
  const [known, setKnown] = useState(initialSaved !== undefined);
  const [hydrating, setHydrating] = useState(initialSaved === undefined);
  const [busy, setBusy] = useState(false);
  const feedback = useAppFeedback();
  useEffect(() => {
    if (initialSaved !== undefined) {
      if (!favoriteIds) favoriteIds = new Set();
      if (initialSaved) favoriteIds.add(animalId); else favoriteIds.delete(animalId);
      return;
    }
    let active = true;
    void loadFavoriteIds()
      .then(ids => { if (active) { setSaved(ids.has(animalId)); setKnown(true); } })
      .catch(() => { if (active) setKnown(false); })
      .finally(() => { if (active) setHydrating(false); });
    return () => { active = false; };
  }, [animalId, initialSaved]);
  useEffect(() => {
    const sync = (event: Event) => {
      const detail = (event as CustomEvent<{ animalId?: string; saved?: boolean }>).detail;
      if (detail?.animalId === animalId) setSaved(Boolean(detail.saved));
    };
    window.addEventListener("ff-favorite-change", sync);
    return () => window.removeEventListener("ff-favorite-change", sync);
  }, [animalId]);
  async function toggle() {
    if (busy || hydrating) return;
    setBusy(true);
    let current = saved;
    if (!known) {
      try {
        const ids = await loadFavoriteIds();
        current = ids.has(animalId);
        setSaved(current);
        setKnown(true);
      } catch {
        feedback.error("스크랩 상태를 확인하지 못했어요. 다시 시도해 주세요.");
        setBusy(false);
        return;
      }
    }
    const response = await fetch("/api/favorites", { method: current ? "DELETE" : "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ animalId }) });
    if (response.status === 401) window.location.href = `/login?return_to=${encodeURIComponent(location.pathname)}`;
    else if (response.ok) {
      const next = !current;
      setSaved(next);
      if (!favoriteIds) favoriteIds = new Set();
      if (next) favoriteIds.add(animalId); else favoriteIds.delete(animalId);
      window.dispatchEvent(new CustomEvent("ff-favorite-change", { detail: { animalId, saved: next } }));
      onFavoriteChange?.(next);
      feedback.success(next ? "관심 친구로 스크랩했어요" : "스크랩에서 삭제했어요", next ? { actionLabel: "목록보기", onAction: () => { location.href = "/mypage/favorites"; } } : undefined);
    } else feedback.error("스크랩을 변경하지 못했어요");
    setBusy(false);
  }
  return <button type="button" className="ff-card-scrap" aria-pressed={saved} aria-busy={hydrating || busy} aria-label={`${animalName} ${hydrating ? "스크랩 상태 확인 중" : saved ? "스크랩에서 삭제" : "스크랩하기"}`} onClick={toggle} disabled={hydrating || busy}><Bookmark aria-hidden="true" strokeWidth={1.8} fill={saved ? "currentColor" : "none"}/></button>;
}
