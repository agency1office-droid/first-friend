"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { Animal } from "../../lib/data";
import type { HomeLocation } from "../../lib/geo";
import { readHomeLocation } from "../../lib/geo";
import type { AnimalPage } from "../../lib/public-animal-store";

export type AnimalFeedFilters = {
  sort: "distance" | "recent";
  species: "all" | "cat" | "dog";
  publicStatus: "all" | "notice" | "checking";
  breedKeys: string[];
  sex: "all" | "female" | "male";
  color: string;
};

const defaultFilters: AnimalFeedFilters = { sort: "distance", species: "all", publicStatus: "all", breedKeys: [], sex: "all", color: "all" };
export const HOME_FEED_SNAPSHOT_KEY = "ff-home-feed-snapshot-v2";

type FeedSnapshot = { url: string; items: Animal[]; total: number; cursor: string | null; syncedAt: string | null; stale: boolean; scrollY: number };

function readFeedSnapshot(): FeedSnapshot | null {
  if (typeof window === "undefined") return null;
  try {
    const snapshot = JSON.parse(window.sessionStorage.getItem(HOME_FEED_SNAPSHOT_KEY) || "null") as Partial<FeedSnapshot> | null;
    const url = `${window.location.pathname}${window.location.search}`;
    if (!snapshot || snapshot.url !== url || !Array.isArray(snapshot.items)) return null;
    return { url, items: snapshot.items, total: Number(snapshot.total) || 0, cursor: typeof snapshot.cursor === "string" ? snapshot.cursor : null, syncedAt: typeof snapshot.syncedAt === "string" ? snapshot.syncedAt : null, stale: Boolean(snapshot.stale), scrollY: Number(snapshot.scrollY) || 0 };
  } catch { return null; }
}

function filtersFromUrl() {
  const params = new URLSearchParams(window.location.search);
  const sort = params.get("sort"), species = params.get("species"), publicStatus = params.get("status"), sex = params.get("sex"), color = params.get("color");
  return {
    sort: sort === "recent" ? "recent" : "distance",
    species: species === "cat" || species === "dog" ? species : "all",
    publicStatus: publicStatus === "notice" || publicStatus === "checking" ? publicStatus : "all",
    breedKeys: (params.get("breeds") || "").split(",").filter(value => /^(417000|422400):\d{6}$/.test(value)).slice(0, 10),
    sex: sex === "female" || sex === "male" ? sex : "all",
    color: color?.trim() || "all",
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
    if (filters.color !== "all") params.set("color", filters.color);
    if (filters.sort === "recent") params.set("sort", "recent");
    if (nextCursor) params.set("cursor", nextCursor);
    return `/api/animals?${params}`;
  }, [filters, location]);

  useEffect(() => { const timer = window.setTimeout(() => { setFilters(filtersFromUrl()); setFiltersReady(true); }, 0); return () => window.clearTimeout(timer); }, []);

  useEffect(() => {
    if (!filtersReady) return;
    const url = new URL(window.location.href);
    for (const key of ["sort", "distance", "species", "status", "breed", "breeds", "age", "size", "sex", "color"]) url.searchParams.delete(key);
    if (filters.sort === "recent") url.searchParams.set("sort", "recent");
    if (filters.species !== "all") url.searchParams.set("species", filters.species);
    if (filters.publicStatus !== "all") url.searchParams.set("status", filters.publicStatus);
    if (filters.breedKeys.length) url.searchParams.set("breeds", filters.breedKeys.join(","));
    if (filters.sex !== "all") url.searchParams.set("sex", filters.sex);
    if (filters.color !== "all") url.searchParams.set("color", filters.color);
    window.history.replaceState(window.history.state, "", `${url.pathname}${url.search}${url.hash}`);
  }, [filters, filtersReady]);

  useEffect(() => {
    const update = (event?: Event) => {
      const detail = (event as CustomEvent<HomeLocation> | undefined)?.detail;
      const next = detail || readHomeLocation();
      setLocation(next);
      setRegion(next?.label || window.localStorage.getItem("ff-home-region") || "");
      setReady(true);
    };
    update();
    window.addEventListener("ff-region-change", update);
    return () => window.removeEventListener("ff-region-change", update);
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
      const onScroll = () => {
        const current = JSON.parse(window.sessionStorage.getItem(HOME_FEED_SNAPSHOT_KEY) || "null") as Partial<FeedSnapshot> | null;
        if (current?.url === url) window.sessionStorage.setItem(HOME_FEED_SNAPSHOT_KEY, JSON.stringify({ ...current, scrollY: window.scrollY }));
      };
      window.addEventListener("scroll", onScroll, { passive: true });
      return () => window.removeEventListener("scroll", onScroll);
    } catch { return undefined; }
  }, [cursor, filtersReady, items, ready, stale, syncedAt, total]);

  const loadMore = useCallback(async () => {
    if (!cursor || loading) return;
    setLoading(true); setError("");
    try {
      const url = endpoint(cursor);
      const body = prefetchedUrl.current === url && prefetchedPage.current
        ? await prefetchedPage.current
        : await fetch(url).then(async response => {
          const result = await response.json() as Record<string, unknown>;
          if (!response.ok) throw new Error(typeof result.error === "string" ? result.error : "다음 친구를 불러오지 못했어요.");
          return result;
        });
      prefetchedPage.current = null; prefetchedUrl.current = null;
      setItems(current => {
        const ids = new Set(current.map(item => item.id));
        return [...current, ...((body.items as Animal[] | undefined) || []).filter((item: Animal) => !ids.has(item.id))];
      });
      setCursor(typeof body.nextCursor === "string" ? body.nextCursor : null); setTotal(Number(body.total) || total);
      setSyncedAt(typeof body.syncedAt === "string" ? body.syncedAt : syncedAt); setStale(Boolean(body.stale));
    } catch (errorValue) {
      setError(errorValue instanceof Error ? errorValue.message : "다음 친구를 불러오지 못했어요.");
    } finally { setLoading(false); }
  }, [cursor, endpoint, loading, syncedAt, total]);

  const setFilter = useCallback(<K extends keyof AnimalFeedFilters>(key: K, value: AnimalFeedFilters[K]) => setFilters(current => ({ ...current, [key]: value })), []);
  const resetFilters = useCallback(() => setFilters(defaultFilters), []);
  const activeCount = Number(filters.sort === "recent") + Number(filters.species !== "all") + Number(filters.publicStatus !== "all") + Number(filters.breedKeys.length > 0) + Number(filters.sex !== "all") + Number(filters.color !== "all");
  return { items, total, cursor, syncedAt, stale, location, region, filters, setFilter, resetFilters, activeCount, loading, error, loadMore };
}
