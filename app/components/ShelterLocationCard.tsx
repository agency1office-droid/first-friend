"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Image from "next/image";
import { ActionButton } from "seed-design/ui/action-button";
import { distanceMeters, formatDistance, formatDrivingDuration, readHomeLocation, type HomeLocation } from "../../lib/geo";

export type KakaoMaps = {
  load: (callback: () => void) => void;
  LatLng: new (lat: number, lng: number) => object;
  Map: new (container: HTMLElement, options: { center: object; level: number }) => object;
  Marker: new (options: { map: object; position: object; title?: string }) => object;
};

declare global {
  interface Window { kakao?: { maps: KakaoMaps } }
}

export function loadKakaoMaps(key: string) {
  return new Promise<KakaoMaps>((resolve, reject) => {
    const ready = () => window.kakao?.maps.load(() => resolve(window.kakao!.maps));
    if (window.kakao?.maps) return ready();
    const current = document.querySelector<HTMLScriptElement>("script[data-ff-kakao-map]");
    if (current) {
      current.addEventListener("load", ready, { once: true });
      current.addEventListener("error", () => reject(new Error("Kakao Maps SDK load failed")), { once: true });
      return;
    }
    const script = document.createElement("script");
    script.dataset.ffKakaoMap = "true";
    script.src = `https://dapi.kakao.com/v2/maps/sdk.js?appkey=${encodeURIComponent(key)}&autoload=false`;
    script.async = true;
    script.addEventListener("load", ready, { once: true });
    script.addEventListener("error", () => reject(new Error("Kakao Maps SDK load failed")), { once: true });
    document.head.appendChild(script);
  });
}

export function ShelterLocationCard({
  jsKey, name, lat, lng, approximate,
}: {
  jsKey: string; name: string; lat: number; lng: number; approximate?: boolean;
}) {
  const sectionRef = useRef<HTMLElement>(null);
  const mapRef = useRef<HTMLDivElement>(null);
  const [home, setHome] = useState<HomeLocation | null>(null);
  const [visible, setVisible] = useState(false);
  const [mapFailed, setMapFailed] = useState(!jsKey);
  const [driveRoute, setDriveRoute] = useState<{ key: string; durationSeconds: number } | null>(null);
  const meters = useMemo(() => home ? distanceMeters(home, { lat, lng }) : null, [home, lat, lng]);
  const driveRouteKey = home ? `${home.lat},${home.lng}:${lat},${lng}` : "";
  const driveDurationSeconds = driveRoute?.key === driveRouteKey ? driveRoute.durationSeconds : null;

  useEffect(() => { void Promise.resolve().then(() => setHome(readHomeLocation())); }, []);
  useEffect(() => {
    const element = sectionRef.current;
    if (!element || typeof IntersectionObserver === "undefined") {
      setVisible(true);
      return;
    }
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setVisible(true);
          observer.disconnect();
        }
      },
      { rootMargin: "600px" },
    );
    observer.observe(element);
    return () => observer.disconnect();
  }, []);
  useEffect(() => {
    if (!visible || !home) return;
    const controller = new AbortController();
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
          setDriveRoute({ key: driveRouteKey, durationSeconds: result!.durationSeconds! });
        }
      })
      .catch(() => undefined);
    return () => controller.abort();
  }, [driveRouteKey, home, lat, lng, visible]);
  useEffect(() => {
    if (!visible || !mapRef.current || !jsKey) return;
    let active = true;
    void loadKakaoMaps(jsKey).then((maps) => {
      if (!active || !mapRef.current) return;
      const shelterPoint = new maps.LatLng(lat, lng);
      const map = new maps.Map(mapRef.current, { center: shelterPoint, level: 3 });
      new maps.Marker({ map, position: shelterPoint, title: name });
    }).catch(() => { if (active) setMapFailed(true); });
    return () => { active = false; };
  }, [jsKey, lat, lng, name, visible]);

  const mapHref = `https://map.kakao.com/link/map/${encodeURIComponent(name)},${lat},${lng}`;
  const routeHref = `https://map.kakao.com/link/to/${encodeURIComponent(name)},${lat},${lng}`;
  const staticMapHref = `/api/maps/static?lat=${lat}&lng=${lng}`;
  return <section ref={sectionRef} className="ff-shelter-location" id="shelter-contact">
    <p className="ff-shelter-distance-summary" aria-live="polite">
      {meters !== null
        ? `우리 동네에서 약 ${formatDistance(meters)}${driveDurationSeconds !== null ? ` · 차로 약 ${formatDrivingDuration(driveDurationSeconds)}` : ""}`
        : "지도에서 보호소 위치를 확인해 보세요"}
    </p>
    {!mapFailed && <div ref={mapRef} className="ff-kakao-map" aria-label={`${name} 카카오 지도`} />}
    {mapFailed && <Image className="ff-kakao-map" src={staticMapHref} alt={`${name} 위치를 표시한 카카오 지도`} width={640} height={360} unoptimized />}
    {approximate && <p className="ff-meta">공공데이터에 정확한 좌표가 없어 관할 지역 중심을 표시합니다. 방문 전 보호소에 위치를 확인하세요.</p>}
    <div className="ff-map-actions">
      <ActionButton asChild variant="neutralWeak"><a href={mapHref} target="_blank" rel="noreferrer" aria-label="카카오맵에서 보기, 새 창">카카오맵에서 보기</a></ActionButton>
      <ActionButton asChild><a href={routeHref} target="_blank" rel="noreferrer" aria-label="길찾기, 새 창">길찾기</a></ActionButton>
    </div>
  </section>;
}
