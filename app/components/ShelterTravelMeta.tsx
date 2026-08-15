"use client";

import { useEffect, useState } from "react";
import { distanceMeters, formatDistance, formatDrivingDuration, readHomeLocation } from "../../lib/geo";

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

  useEffect(() => {
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) return;
    const home = readHomeLocation();
    if (!home) return;
    const meters = distanceMeters(home, { lat: lat!, lng: lng! });
    const controller = new AbortController();
    queueMicrotask(() => {
      if (!controller.signal.aborted) setDistanceLabel(formatDistance(meters));
    });
    const params = new URLSearchParams({
      originLat: String(home.lat),
      originLng: String(home.lng),
      destinationLat: String(lat),
      destinationLng: String(lng),
    });
    void fetch(`/api/maps/directions?${params}`, { signal: controller.signal })
      .then(async (response) => response.ok ? response.json() as Promise<{ durationSeconds?: number }> : null)
      .then((result) => {
        if (Number.isFinite(result?.durationSeconds)) setDurationLabel(formatDrivingDuration(result!.durationSeconds!));
      })
      .catch(() => undefined);
    return () => controller.abort();
  }, [lat, lng]);

  if (!distanceLabel) return null;
  return <p className="ff-detail-shelter-meta" aria-live="polite">
    {distanceLabel}{durationLabel ? ` · 차로 약 ${durationLabel}` : ""}
  </p>;
}
