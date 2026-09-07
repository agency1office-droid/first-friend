"use client";

import Image from "next/image";
import { useEffect, useRef, useState } from "react";
import { ActionButton } from "seed-design/ui/action-button";
import { IconChevronRightLine } from "@karrotmarket/react-monochrome-icon";
import { loadKakaoMaps, type KakaoMaps } from "./ShelterLocationCard";

type Coordinates = { lat: number; lng: number };

export function LostLocationCard({ address, region, jsKey }: { address: string; region: string; jsKey: string }) {
  const query = address || region;
  const mapRef = useRef<HTMLDivElement>(null);
  const [coordinates, setCoordinates] = useState<Coordinates | null>(null);
  const [mapFailed, setMapFailed] = useState(!jsKey);

  useEffect(() => {
    const controller = new AbortController();
    void fetch(`/api/maps/address-coordinates?q=${encodeURIComponent(query)}`, { signal: controller.signal })
      .then(async response => response.ok ? response.json() as Promise<{ coordinates?: Coordinates | null }> : null)
      .then(result => setCoordinates(result?.coordinates || null))
      .catch(() => undefined);
    return () => controller.abort();
  }, [query]);

  useEffect(() => {
    if (!coordinates || !mapRef.current || !jsKey) return;
    let active = true;
    void loadKakaoMaps(jsKey).then((maps: KakaoMaps) => {
      if (!active || !mapRef.current) return;
      const point = new maps.LatLng(coordinates.lat, coordinates.lng);
      const map = new maps.Map(mapRef.current, { center: point, level: 4 });
      new maps.Marker({ map, position: point, title: "실종 당시 위치" });
    }).catch(() => active && setMapFailed(true));
    return () => { active = false; };
  }, [coordinates, jsKey]);

  const mapHref = coordinates
    ? `https://map.kakao.com/link/map/${encodeURIComponent("실종 당시 친구의 위치")},${coordinates.lat},${coordinates.lng}`
    : `https://map.kakao.com/?q=${encodeURIComponent(query)}`;
  const staticMapHref = coordinates ? `/api/maps/static?lat=${coordinates.lat}&lng=${coordinates.lng}` : "";
  return <section className="ff-shelter-location ff-lost-location" aria-labelledby="lost-detail-place-title">
    <a className="ff-shelter-map-prompt" href={mapHref} target="_blank" rel="noreferrer"><span id="lost-detail-place-title">실종 당시 친구의 위치</span><IconChevronRightLine aria-hidden /></a>
    {coordinates && (!mapFailed ? <div ref={mapRef} className="ff-kakao-map" aria-label="실종 당시 위치 카카오 지도" /> : <Image className="ff-kakao-map" src={staticMapHref} alt="실종 당시 위치를 표시한 카카오 지도" width={640} height={360} unoptimized />)}
    {coordinates && <div className="ff-map-actions"><ActionButton asChild variant="neutralWeak"><a href={mapHref} target="_blank" rel="noreferrer">카카오맵에서 보기</a></ActionButton><ActionButton asChild variant="neutralWeak"><a href={`https://map.kakao.com/link/to/${encodeURIComponent("실종 당시 친구의 위치")},${coordinates.lat},${coordinates.lng}`} target="_blank" rel="noreferrer">길찾기</a></ActionButton></div>}
  </section>;
}
