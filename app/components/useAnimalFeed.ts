"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { Animal } from "../../lib/data";
import type { HomeLocation } from "../../lib/geo";
import { readHomeLocation } from "../../lib/geo";
import type { AnimalPage } from "../../lib/public-animal-store";
import { optimizedAnimalImageUrl } from "../../lib/image-url";

export type AnimalFeedFilters = {
  sort: "distance" | "recent";
  species: "all" | "cat" | "dog";
  publicStatus: "all" | "notice" | "checking";
  breedKeys: string[];
  sex: "all" | "female" | "male";
  neutered: "all" | "yes" | "no";
  color: string;
  ageGroup: "all" | "young" | "adult" | "unknown";
  sizeGroup: "all" | "small" | "medium" | "large" | "unknown";
  ageMin: number;
  ageMax: number;
  weightMin: number;
  weightMax: number;
};

const defaultFilters: AnimalFeedFilters = { sort: "distance", species: "all", publicStatus: "all", breedKeys: [], sex: "all", neutered: "all", color: "all", ageGroup: "all", sizeGroup: "all", ageMin: 0, ageMax: 20, weightMin: 0, weightMax: 50 };
export const HOME_FEED_SNAPSHOT_KEY = "ff-home-feed-snapshot-v2";

type FeedSnapshot = { url: string; items: Animal[]; total: number; cursor: string | null; syncedAt: string | null; stale: boolean; scrollY: number };
const preloadedAnimalImages = new Set<string>();

function readFeedSnapshot(): FeedSnapshot | null {
  if (typeof window === "undefined") return null;
  try {
    const snapshot = JSON.parse(window.sessionStorage.getItem(HOME_FEED_SNAPSHOT_KEY) || "null") as Partial<FeedSnapshot> | null;
    const url = `${window.location.pathname}${window.location.search}`;
    if (!snapshot || snapshot.url !== url || !Array.isArray(snapshot.items)) return null;
    return { url, items: snapshot.items, total: Number(snapshot.total) || 0, cursor: typeof snapshot.cursor === "string" ? snapshot.cursor : null, syncedAt: typeof snapshot.syncedAt === "string" ? snapshot.syncedAt : null, stale: Boolean(snapshot.stale), scrollY: Number(snapshot.scrollY) || 0 };
  } catch { return null; }
}

function preloadAnimalImages(items: Animal[]) {
  if (typeof window === "undefined") return;
  const connection = (navigator as Navigator & { connection?: { saveData?: boolean; effectiveType?: string } }).connection;
  if (connection?.saveData || connection?.effectiveType === "slow-2g" || connection?.effectiveType === "2g") return;
  const limit = connection?.effectiveType === "3g" ? 2 : 4;
  const sources = [...new Set(items.map(item => optimizedAnimalImageUrl(item.image)).filter(Boolean))]
    .filter(src => !preloadedAnimalImages.has(src))
    .slice(0, limit);
  if (!sources.length) return;
  sources.forEach(src => preloadedAnimalImages.add(src));
  const start = () => sources.forEach(src => { const image = new window.Image(); image.decoding = "async"; image.src = src; });
  const idle = (window as Window & { requestIdleCallback?: (callback: () => void, options?: { timeout: number }) => number }).requestIdleCallback;
  if (idle) idle(start, { timeout: 1200 });
  else window.setTimeout(start, 200);
}

function filtersFromUrl() {
  const params = new URLSearchParams(window.location.search);
  const sort = params.get("sort"), species = params.get("species"), publicStatus = params.get("status"), sex = params.get("sex"), neutered = params.get("neutered"), color = params.get("color"), ageGroup = params.get("age"), sizeGroup = params.get("size");
  return {
    sort: sort === "recent" ? "recent" : "distance",
    species: species === "cat" || species === "dog" ? species : "all",
    publicStatus: publicStatus === "notice" || publicStatus === "checking" ? publicStatus : "all",
    breedKeys: (params.get("breeds") || "").split(",").filter(value => /^(417000|422400):\d{6}$/.test(value)).slice(0, 10),
    sex: sex === "female" || sex === "male" ? sex : "all",
    neutered: neutered === "yes" || neutered === "no" ? neutered : "all",
    color: color?.trim() || "all",
    ageGroup: ageGroup === "young" || ageGroup === "adult" || ageGroup === "unknown" ? ageGroup : "all",
    sizeGroup: sizeGroup === "small" || sizeGroup === "medium" || sizeGroup === "large" || sizeGroup === "unknown" ? sizeGroup : "all",
    ageMin: Math.max(0, Math.min(20, Number(params.get("ageMin")) || 0)), ageMax: Math.max(0, Math.min(20, Number(params.get("ageMax")) || 20)),
    weightMin: Math.max(0, Math.min(50, Number(params.get("weightMin")) || 0)), weightMax: Math.max(0, Math.min(50, Number(params.get("weightMax")) || 50)),
  } satisfies AnimalFeedFilters;
}

export function useAnimalFeed(initialPage: AnimalPage) {
  const restorePending = useRef(false);
  const [items, setItems] = useState<Animal[]>(initialPage.items);
  const [total, setTotal] = useState(initialPage.total);
  const [cursor, setCursor] = useState<string | null>(initialPage.nextCursor);
  const [syncedAt, setSyncedAt] = useState<string | null>(initialPage.syncedAt);
  const [stale, setStale] = useState(initialPage.stale);
  const [location, setLocation] = useState<HomeLocation | null>(null);
  const [region, setRegion] = useState("");
  const [filters, setFilters] = useState<AnimalFeedFilters>(defaultFilters);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [ready, setReady] = useState(false);
  const [filtersReady, setFiltersReady] = useState(false);
  const [userEngaged, setUserEngaged] = useState(false);
  const requestId = useRef(0);
  const prefetchedPage = useRef<Promise<Record<string, unknown>> | null>(null);
  const prefetchedUrl = useRef<string | null>(null);
  const loadMoreController = useRef<AbortController | null>(null);

  useEffect(() => () => loadMoreController.current?.abort(), []);

  useEffect(() => {
    const snapshot = readFeedSnapshot();
    if (!snapshot) return;
    restorePending.current = true;
    const timer = window.setTimeout(() => {
      setItems(snapshot.items); setTotal(snapshot.total); setCursor(snapshot.cursor);
      setSyncedAt(snapshot.syncedAt); setStale(snapshot.stale);
    }, 0);
    return () => window.clearTimeout(timer);
  }, []);

  const endpoint = useCallback((nextCursor?: string | null) => {
    const params = new URLSearchParams({ limit: "20" });
    if (location) { params.set("lat", String(location.lat)); params.set("lng", String(location.lng)); }
    if (filters.species !== "all") params.set("species", filters.species);
    if (filters.publicStatus !== "all") params.set("status", filters.publicStatus);
    if (filters.breedKeys.length) params.set("breeds", filters.breedKeys.join(","));
    if (filters.sex !== "all") params.set("sex", filters.sex);
    if (filters.neutered !== "all") params.set("neutered", filters.neutered);
    if (filters.ageMin !== 0) params.set("ageMin", String(filters.ageMin)); if (filters.ageMax !== 20) params.set("ageMax", String(filters.ageMax));
    if (filters.weightMin !== 0) params.set("weightMin", String(filters.weightMin)); if (filters.weightMax !== 50) params.set("weightMax", String(filters.weightMax));
    if (filters.color !== "all") params.set("color", filters.color);
    if (filters.ageGroup !== "all") params.set("age", filters.ageGroup);
    if (filters.sizeGroup !== "all") params.set("size", filters.sizeGroup);
    // 정렬값을 생략하면 서버 기본값이 최신순이 되므로,
    // 홈 기본 정렬인 가까운 순도 요청에 명시적으로 전달합니다.
    params.set("sort", filters.sort);
    if (nextCursor) params.set("cursor", nextCursor);
    return `/api/animals?${params}`;
  }, [filters, location]);

  useEffect(() => { const timer = window.setTimeout(() => { setFilters(filtersFromUrl()); setFiltersReady(true); }, 0); return () => window.clearTimeout(timer); }, []);

  useEffect(() => {
    if (!filtersReady) return;
    const url = new URL(window.location.href);
    for (const key of ["sort", "distance", "species", "status", "breed", "breeds", "age", "size", "sex", "neutered", "ageMin", "ageMax", "weightMin", "weightMax", "color"]) url.searchParams.delete(key);
    if (filters.sort === "recent") url.searchParams.set("sort", "recent");
    if (filters.species !== "all") url.searchParams.set("species", filters.species);
    if (filters.publicStatus !== "all") url.searchParams.set("status", filters.publicStatus);
    if (filters.breedKeys.length) url.searchParams.set("breeds", filters.breedKeys.join(","));
    if (filters.sex !== "all") url.searchParams.set("sex", filters.sex);
    if (filters.neutered !== "all") url.searchParams.set("neutered", filters.neutered);
    if (filters.ageMin !== 0) url.searchParams.set("ageMin", String(filters.ageMin)); if (filters.ageMax !== 20) url.searchParams.set("ageMax", String(filters.ageMax));
    if (filters.weightMin !== 0) url.searchParams.set("weightMin", String(filters.weightMin)); if (filters.weightMax !== 50) url.searchParams.set("weightMax", String(filters.weightMax));
    if (filters.color !== "all") url.searchParams.set("color", filters.color);
    window.history.replaceState(window.history.state, "", `${url.pathname}${url.search}${url.hash}`);
  }, [filters, filtersReady]);

  useEffect(() => {
    let active = true;
    const update = async (event?: Event) => {
      const detail = (event as CustomEvent<HomeLocation> | undefined)?.detail;
      let next = detail || readHomeLocation();
      // 상단 주소 표시보다 피드가 먼저 마운트될 수 있습니다.
      // IP 좌표를 확보하기 전에는 첫 목록 요청을 보내지 않아
      // 거리순 요청이 최신순으로 대체되는 것을 막습니다.
      if (!next && !detail) {
        next = await fetch("/api/location/default", { cache: "no-store" })
          .then(response => response.ok ? response.json() as Promise<{ location?: HomeLocation | null }> : { location: null })
          .then(body => body.location || null)
          .catch(() => null);
        if (next && active) {
          window.localStorage.setItem("ff-ip-location", JSON.stringify(next));
          window.localStorage.setItem("ff-home-location", JSON.stringify(next));
        }
      }
      if (!active) return;
      setLocation(next);
      setRegion(next?.label || window.localStorage.getItem("ff-home-region") || "");
      setReady(true);
    };
    void update();
    window.addEventListener("ff-region-change", update);
    return () => { active = false; window.removeEventListener("ff-region-change", update); };
  }, []);

  useEffect(() => {
    if (!ready || !filtersReady) return;
    if (restorePending.current) { restorePending.current = false; return; }
    const current = ++requestId.current;
    const controller = new AbortController();
    async function refresh() {
      await Promise.resolve();
      setLoading(true);
      setError("");
      return fetch(endpoint(), { signal: controller.signal })
      .then(async response => {
        const body = await response.json();
        if (!response.ok) throw new Error(body.error || "친구 목록을 불러오지 못했어요.");
        if (current !== requestId.current) return;
        setItems(body.items || []); setTotal(body.total || 0); setCursor(body.nextCursor || null);
        setSyncedAt(body.syncedAt || null); setStale(Boolean(body.stale));
      })
      .catch(errorValue => { if (!controller.signal.aborted && current === requestId.current) setError(errorValue instanceof Error ? errorValue.message : "친구 목록을 불러오지 못했어요."); })
      .finally(() => { if (!controller.signal.aborted && current === requestId.current) setLoading(false); });
    }
    void refresh();
    return () => controller.abort();
  }, [endpoint, filtersReady, ready]);

  // 현재 페이지를 읽는 동안 다음 페이지를 미리 받아 두어 사용자가
  // sentinel에 도착했을 때 네트워크 대기 시간을 없앱니다.
  useEffect(() => {
    if (!ready || !filtersReady || !cursor || !userEngaged) return;
    const connection = (navigator as Navigator & { connection?: { saveData?: boolean; effectiveType?: string } }).connection;
    if (connection?.saveData || connection?.effectiveType === "slow-2g" || connection?.effectiveType === "2g") return;
    const url = endpoint(cursor);
    const controller = new AbortController();
    prefetchedUrl.current = url;
    prefetchedPage.current = fetch(url, { signal: controller.signal }).then(async response => {
      const body = await response.json() as Record<string, unknown>;
      if (!response.ok) throw new Error(typeof body.error === "string" ? body.error : "다음 친구를 불러오지 못했어요.");
      if (Array.isArray(body.items)) preloadAnimalImages(body.items as Animal[]);
      return body;
    }).catch(errorValue => {
      if (controller.signal.aborted) throw errorValue;
      prefetchedPage.current = null;
      prefetchedUrl.current = null;
      throw errorValue;
    });
    return () => {
      controller.abort();
      if (prefetchedUrl.current === url) { prefetchedPage.current = null; prefetchedUrl.current = null; }
    };
  }, [cursor, endpoint, filtersReady, ready, userEngaged]);

  // 현재 화면 바로 아래의 카드 이미지를 미리 브라우저 캐시에 넣습니다.
  // 목록 데이터 prefetch와 별개로 이미지 요청을 선행해야 스크롤 순간의 공백을 줄일 수 있습니다.
  useEffect(() => {
    if (!items.length || !userEngaged) return;
    preloadAnimalImages(items.slice(6, 10));
  }, [items, userEngaged]);

  useEffect(() => {
    const engage = () => setUserEngaged(true);
    window.addEventListener("scroll", engage, { passive: true, once: true });
    window.addEventListener("touchmove", engage, { passive: true, once: true });
    window.addEventListener("wheel", engage, { passive: true, once: true });
    return () => {
      window.removeEventListener("scroll", engage);
      window.removeEventListener("touchmove", engage);
      window.removeEventListener("wheel", engage);
    };
  }, []);

  useEffect(() => {
    if (!ready || !filtersReady || !items.length) return;
    try {
      const url = `${window.location.pathname}${window.location.search}`;
      const save = () => {
        const current = JSON.parse(window.sessionStorage.getItem(HOME_FEED_SNAPSHOT_KEY) || "null") as Partial<FeedSnapshot> | null;
        window.sessionStorage.setItem(HOME_FEED_SNAPSHOT_KEY, JSON.stringify({ url, items, total, cursor, syncedAt, stale, scrollY: Number(current?.scrollY) || window.scrollY } satisfies FeedSnapshot));
      };
      save();
      let saveTimer: number | null = null;
      const onScroll = () => {
        if (saveTimer !== null) return;
        saveTimer = window.setTimeout(() => {
          saveTimer = null;
          const current = JSON.parse(window.sessionStorage.getItem(HOME_FEED_SNAPSHOT_KEY) || "null") as Partial<FeedSnapshot> | null;
          if (current?.url === url) window.sessionStorage.setItem(HOME_FEED_SNAPSHOT_KEY, JSON.stringify({ ...current, scrollY: window.scrollY }));
        }, 200);
      };
      window.addEventListener("scroll", onScroll, { passive: true });
      return () => { window.removeEventListener("scroll", onScroll); if (saveTimer !== null) window.clearTimeout(saveTimer); };
    } catch { return undefined; }
  }, [cursor, filtersReady, items, ready, stale, syncedAt, total]);

  const loadMore = useCallback(async () => {
    if (!cursor || loading) return;
    const requestVersion = requestId.current;
    loadMoreController.current?.abort();
    const controller = new AbortController();
    loadMoreController.current = controller;
    setLoading(true); setError("");
    try {
      const url = endpoint(cursor);
      const body = prefetchedUrl.current === url && prefetchedPage.current
        ? await prefetchedPage.current
        : await fetch(url, { signal: controller.signal }).then(async response => {
          const result = await response.json() as Record<string, unknown>;
          if (!response.ok) throw new Error(typeof result.error === "string" ? result.error : "다음 친구를 불러오지 못했어요.");
          return result;
        });
      if (requestVersion !== requestId.current || controller.signal.aborted) return;
      prefetchedPage.current = null; prefetchedUrl.current = null;
      setItems(current => {
        const ids = new Set(current.map(item => item.id));
        return [...current, ...((body.items as Animal[] | undefined) || []).filter((item: Animal) => !ids.has(item.id))];
      });
      setCursor(typeof body.nextCursor === "string" ? body.nextCursor : null); setTotal(Number(body.total) || total);
      setSyncedAt(typeof body.syncedAt === "string" ? body.syncedAt : syncedAt); setStale(Boolean(body.stale));
    } catch (errorValue) {
      if (!controller.signal.aborted && requestVersion === requestId.current) setError(errorValue instanceof Error ? errorValue.message : "다음 친구를 불러오지 못했어요.");
    } finally {
      if (loadMoreController.current === controller) loadMoreController.current = null;
      if (!controller.signal.aborted && requestVersion === requestId.current) setLoading(false);
    }
  }, [cursor, endpoint, loading, syncedAt, total]);

  const setFilter = useCallback(<K extends keyof AnimalFeedFilters>(key: K, value: AnimalFeedFilters[K]) => setFilters(current => ({ ...current, [key]: value })), []);
  const resetFilters = useCallback(() => setFilters(defaultFilters), []);
  const activeCount = Number(filters.sort === "recent") + Number(filters.species !== "all") + Number(filters.publicStatus !== "all") + Number(filters.breedKeys.length > 0) + Number(filters.sex !== "all") + Number(filters.neutered !== "all") + Number(filters.color !== "all") + Number(filters.ageGroup !== "all") + Number(filters.sizeGroup !== "all") + Number(filters.ageMin !== 0 || filters.ageMax !== 20) + Number(filters.weightMin !== 0 || filters.weightMax !== 50);
  return { items, total, cursor, syncedAt, stale, location, region, filters, setFilter, resetFilters, activeCount, loading, error, loadMore };
}
