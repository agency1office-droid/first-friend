"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Bookmark } from "lucide-react";
import { useAppFeedback } from "./AppFeedback";

const cacheKey = "ff-favorites-display-v1";
let favoriteIds: Set<string> | null = null;
let favoriteIdsRequest: Promise<Set<string>> | null = null;
let cacheScope = "";
let checked = false;
let readGeneration = 0;
let restoredEvent: PageTransitionEvent | null = null;
const confirmedChanges = new Map<string, boolean>();
const pendingChanges = new Map<string, boolean>();

function readCache(refresh = false) {
  if (typeof document === "undefined") return favoriteIds;
  const scope = document.body.dataset.favoriteScope || "guest";
  if (scope === cacheScope && !refresh) return favoriteIds;
  if (scope !== cacheScope) {
    cacheScope = scope; favoriteIdsRequest = null; checked = false; readGeneration++;
    confirmedChanges.clear(); pendingChanges.clear();
  }
  favoriteIds = null;
  try {
    const cached = JSON.parse(sessionStorage.getItem(cacheKey) || "null");
    if (scope !== "guest" && cached?.scope === scope && Array.isArray(cached.ids) && cached.ids.every((id: unknown) => typeof id === "string")) favoriteIds = new Set(cached.ids);
    else sessionStorage.removeItem(cacheKey);
  } catch { /* Storage is optional; the server remains authoritative. */ }
  return favoriteIds;
}
function persistCache() {
  try {
    if (cacheScope && cacheScope !== "guest" && favoriteIds) sessionStorage.setItem(cacheKey, JSON.stringify({ scope: cacheScope, ids: [...favoriteIds] }));
    else sessionStorage.removeItem(cacheKey);
  } catch { /* Full or blocked storage must not prevent saving. */ }
}
function loadFavoriteIds() {
  readCache();
  if (checked && favoriteIds) return Promise.resolve(favoriteIds);
  if (!favoriteIdsRequest) {
    const scope = cacheScope;
    const generation = ++readGeneration;
    favoriteIdsRequest = fetch("/api/favorites", { cache: "no-store" })
      .then(async response => {
        if (!response.ok) throw new Error("관심 친구 목록을 불러오지 못했어요.");
        const body = await response.json() as { favorites?: { animalId?: string }[] };
        const ids = new Set((body.favorites || []).map(item => item.animalId || "").filter(Boolean));
        if (scope === cacheScope && generation === readGeneration) {
          // A read started before a click must not undo its confirmed write.
          confirmedChanges.forEach((saved, id) => saved ? ids.add(id) : ids.delete(id));
          favoriteIds = ids; checked = true; persistCache();
        }
        return favoriteIds || new Set<string>();
      }).finally(() => { if (scope === cacheScope && generation === readGeneration) favoriteIdsRequest = null; });
  }
  return favoriteIdsRequest;
}
function notify(animalId: string, saved: boolean) {
  window.dispatchEvent(new CustomEvent("ff-favorite-change", { detail: { animalId, saved } }));
}

export function FavoriteButton({ animalId, animalName, initialSaved, onFavoriteChange, className }: { animalId: string; animalName: string; initialSaved?: boolean; onFavoriteChange?: (saved: boolean) => void; className?: string }) {
  const router = useRouter();
  const [saved, setSaved] = useState(initialSaved ?? false);
  const [busy, setBusy] = useState(false);
  const lock = useRef(false);
  const feedback = useAppFeedback();
  useEffect(() => {
    let active = true;
    const apply = (ids: Set<string> | null) => {
      if (active) setSaved(pendingChanges.get(animalId) ?? confirmedChanges.get(animalId) ?? initialSaved ?? (ids ? ids.has(animalId) : false));
    };
    const cached = readCache();
    // Restore the display without waiting for a request.
    void Promise.resolve(cached).then(apply);
    void loadFavoriteIds().then(apply).catch(() => { /* Keep the last known display; mutations report their own errors. */ });
    const sync = (event: Event) => {
      const detail = (event as CustomEvent<{ animalId?: string; saved?: boolean }>).detail;
      if (detail?.animalId === animalId) setSaved(Boolean(detail.saved));
    };
    const restore = (event: PageTransitionEvent) => {
      if (!event.persisted) return;
      if (restoredEvent !== event) {
        restoredEvent = event; checked = false; favoriteIdsRequest = null; readGeneration++;
        confirmedChanges.clear(); readCache(true);
      }
      apply(readCache());
      void loadFavoriteIds().then(apply).catch(() => {});
    };
    window.addEventListener("ff-favorite-change", sync);
    window.addEventListener("pageshow", restore);
    return () => { active = false; window.removeEventListener("ff-favorite-change", sync); window.removeEventListener("pageshow", restore); };
  }, [animalId, initialSaved]);

  async function toggle() {
    readCache();
    if (lock.current || pendingChanges.has(animalId)) return;
    lock.current = true; setBusy(true);
    const previous = saved, next = !previous, scope = cacheScope;
    pendingChanges.set(animalId, next);
    setSaved(next); notify(animalId, next);
    try {
      const response = await fetch("/api/favorites", { method: next ? "POST" : "DELETE", headers: { "content-type": "application/json" }, body: JSON.stringify({ animalId }), keepalive: true });
      if (!response.ok) {
        const restored = confirmedChanges.get(animalId) ?? favoriteIds?.has(animalId) ?? previous;
        setSaved(restored); notify(animalId, restored);
        if (response.status === 401) {
          favoriteIds = null; checked = false; confirmedChanges.clear(); persistCache();
          window.location.href = "/login?return_to=" + encodeURIComponent(location.pathname + location.search);
        } else feedback.error("스크랩을 저장하지 못해 이전 상태로 돌렸어요. 다시 시도해 주세요.");
        return;
      }
      if (scope === cacheScope) {
        confirmedChanges.set(animalId, next);
        if (favoriteIds) { if (next) favoriteIds.add(animalId); else favoriteIds.delete(animalId); }
        persistCache();
      }
      onFavoriteChange?.(next);
      feedback.success(next ? "관심 친구로 스크랩했어요" : "스크랩에서 삭제했어요", next ? { actionLabel: "목록보기", onAction: () => { router.push("/mypage/favorites"); } } : undefined);
    } catch {
      const restored = confirmedChanges.get(animalId) ?? favoriteIds?.has(animalId) ?? previous;
      setSaved(restored); notify(animalId, restored);
      feedback.error("연결을 확인해 주세요. 스크랩은 이전 상태로 돌렸어요.");
    } finally {
      pendingChanges.delete(animalId); lock.current = false; setBusy(false);
    }
  }
  return <button type="button" className={className ? "ff-card-scrap " + className : "ff-card-scrap"} aria-pressed={saved} aria-busy={busy} aria-disabled={busy} aria-label={animalName + " " + (saved ? "스크랩에서 삭제" : "스크랩하기")} onClick={toggle}><Bookmark aria-hidden="true" strokeWidth={1.8} fill={saved ? "currentColor" : "none"}/></button>;
}
