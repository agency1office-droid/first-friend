"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Image from "next/image";
import type { Shelter } from "../../lib/public-data";
import { ActionButton } from "seed-design/ui/action-button";
import { Callout } from "seed-design/ui/callout";
import { loadKakaoMaps } from "./ShelterLocationCard";

type Position = { lat: number; lng: number };
function distance(a: Position, b: Position) {
  const rad = Math.PI / 180, dLat = (b.lat - a.lat) * rad, dLng = (b.lng - a.lng) * rad;
  const value = Math.sin(dLat / 2) ** 2 + Math.cos(a.lat * rad) * Math.cos(b.lat * rad) * Math.sin(dLng / 2) ** 2;
  return 6371 * 2 * Math.atan2(Math.sqrt(value), Math.sqrt(1 - value));
}

export function ShelterMap({ shelters, jsKey }: { shelters: Shelter[]; jsKey: string }) {
  const mapNode = useRef<HTMLDivElement>(null);
  const mapRef = useRef<{ setCenter: (center: object) => void } | null>(null);
  const mapsRef = useRef<Awaited<ReturnType<typeof loadKakaoMaps>> | null>(null);
  const [position, setPosition] = useState<Position | null>(null), [locationError, setLocationError] = useState(""), [mapError, setMapError] = useState(!jsKey);
  const sorted = useMemo(() => shelters.map(shelter => ({ shelter, km: position ? distance(position, shelter) : null })).sort((a, b) => (a.km ?? 9999) - (b.km ?? 9999)), [shelters, position]);

  useEffect(() => {
    if (!mapNode.current || mapRef.current || !shelters.length || !jsKey) return;
    let alive = true;
    void loadKakaoMaps(jsKey).then(maps => {
      if (!alive || !mapNode.current) return;
      const map = new maps.Map(mapNode.current, { center: new maps.LatLng(36.4, 127.8), level: 13 });
      const bounds = new maps.LatLngBounds();
      shelters.forEach(shelter => {
        const point = new maps.LatLng(shelter.lat, shelter.lng);
        bounds.extend(point);
        new maps.Marker({ map, position: point, title: shelter.name });
      });
      map.setBounds(bounds);
      mapRef.current = map;
      mapsRef.current = maps;
    }).catch(() => { if (alive) setMapError(true); });
    return () => { alive = false; mapRef.current = null; mapsRef.current = null; };
  }, [jsKey, shelters]);

  function locate() {
    setLocationError("");
    if (!navigator.geolocation) return setLocationError("이 기기에서는 위치를 확인할 수 없어요.");
    navigator.geolocation.getCurrentPosition(({ coords }) => {
      const next = { lat: coords.latitude, lng: coords.longitude };
      setPosition(next);
      const maps = mapsRef.current;
      if (maps && mapRef.current) {
        const point = new maps.LatLng(next.lat, next.lng);
        new maps.Marker({ map: mapRef.current, position: point, title: "현재 위치" });
        mapRef.current.setCenter(point);
      }
    }, () => setLocationError("위치 권한을 허용하면 거리순으로 볼 수 있어요."), { enableHighAccuracy: false, timeout: 8000, maximumAge: 300000 });
  }

  return <div className="ff-shelter-map-layout">
    <div>{!mapError && <div ref={mapNode} className="ff-shelter-map" aria-label="카카오맵으로 보는 전국 동물보호소" />}
      {mapError && <Image className="ff-shelter-map" src="/api/maps/shelters" alt="카카오 지도에 표시한 전국 동물보호소" width={640} height={640} unoptimized />}
      {mapError && <Callout tone="informative" title="지도를 이미지로 보여드리고 있어요" description="카카오맵의 확대·이동은 로컬 도메인 등록 후 사용할 수 있어요. 보호소 채널의 카카오 길찾기는 지금도 사용할 수 있습니다." />}
      <p className="ff-meta">지도에는 공개된 보호소 주소만 표시합니다. ‘대략 위치’ 표시는 시·도 중심 좌표이며 방문 경로로 사용하면 안 됩니다.</p>
      <ActionButton onClick={locate}>{position ? "현재 위치로 다시 정렬" : "내 위치에서 가까운 순으로 보기"}</ActionButton>{locationError && <Callout tone="warning" description={locationError}/>}</div>
    <div className="ff-nearby-shelter-list">{sorted.map(({ shelter, km }) => <a href={`/shelters/${encodeURIComponent(shelter.id)}`} key={shelter.id}><div><strong>{shelter.name}</strong><p>{shelter.address}<br/>{shelter.hours}</p></div><span>{km !== null ? `${km.toFixed(km < 10 ? 1 : 0)}km` : shelter.approximateLocation ? "대략 위치" : "카카오맵"}</span></a>)}</div>
  </div>;
}
