"use client";

import { useEffect, useState } from "react";
import { distanceMeters, formatDistance, formatDrivingDuration, readHomeLocation } from "../../lib/geo";

const ROUTE_CACHE_TTL = 10 * 60 * 1000;

function routeCacheKey(originLat: number, originLng: number, destinationLat: number, destinationLng: number) {
  return `ff-route:${originLat},${originLng}:${destinationLat},${destinationLng}`;
}

function readCachedDuration(key: string) {
  try {
    const value = JSON.parse(localStorage.getItem(key) || "null") as { durationSeconds?: number; expiresAt?: number } | null;
    return value && Number.isFinite(value.durationSeconds) && Number(value.expiresAt) > Date.now() ? value.durationSeconds! : null;
  } catch {
    return null;
  }
}

function writeCachedDuration(key: string, durationSeconds: number) {
  try {
    localStorage.setItem(key, JSON.stringify({ durationSeconds, expiresAt: Date.now() + ROUTE_CACHE_TTL }));
  } catch {
    // 저장 공간이 없는 경우에도 현재 요청 결과는 계속 표시합니다.
  }
}

export function ShelterTravelMeta({
  distance,
  lat,
  lng,
}: {
  distance?: number;
  lat?: number;
  lng?: number;
}) {
  const [distanceLabel, setDistanceLabel] = useState(Number.isFinite(distance) ? formatDistance(distance!) : null);
  const [durationLabel, setDurationLabel] = useState<string | null>(null);
  const [durationLoading, setDurationLoading] = useState(false);

  useEffect(() => {
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) return;
    const home = readHomeLocation();
    if (!home) return;
    const meters = distanceMeters(home, { lat: lat!, lng: lng! });
    const controller = new AbortController();
    const cacheKey = routeCacheKey(home.lat, home.lng, lat!, lng!);
    const cachedDuration = readCachedDuration(cacheKey);
    queueMicrotask(() => {
      if (controller.signal.aborted) return;
      setDistanceLabel(formatDistance(meters));
      if (cachedDuration !== null) setDurationLabel(formatDrivingDuration(cachedDuration));
      else setDurationLoading(true);
    });
    if (cachedDuration !== null) return () => controller.abort();
    const params = new URLSearchParams({
      originLat: String(home.lat),
      originLng: String(home.lng),
      destinationLat: String(lat),
      destinationLng: String(lng),
    });
    void fetch(`/api/maps/directions?${params}`, { signal: controller.signal })
      .then(async (response) => response.ok ? response.json() as Promise<{ durationSeconds?: number }> : null)
      .then((result) => {
        if (Number.isFinite(result?.durationSeconds)) {
          const durationSeconds = result!.durationSeconds!;
          writeCachedDuration(cacheKey, durationSeconds);
          setDurationLabel(formatDrivingDuration(durationSeconds));
        }
        setDurationLoading(false);
      })
      .catch(() => setDurationLoading(false));
    return () => controller.abort();
  }, [lat, lng]);

  if (!distanceLabel) return null;
  return <p className="ff-detail-shelter-meta" aria-live="polite">
    <span className="ff-detail-shelter-distance">{distanceLabel}</span>
    {durationLabel ? ` · 차로 약 ${durationLabel}` : durationLoading ? " · 이동 시간 확인 중" : ""}
  </p>;
}
