"use client";

import "leaflet/dist/leaflet.css";
import { useEffect, useMemo, useRef, useState } from "react";
import type { Shelter } from "../../lib/public-data";
import { ActionButton } from "seed-design/ui/action-button";
import { Callout } from "seed-design/ui/callout";

type Position = { lat: number; lng: number };
function distance(a: Position, b: Position) {
  const rad = Math.PI / 180, dLat = (b.lat - a.lat) * rad, dLng = (b.lng - a.lng) * rad;
  const value = Math.sin(dLat / 2) ** 2 + Math.cos(a.lat * rad) * Math.cos(b.lat * rad) * Math.sin(dLng / 2) ** 2;
  return 6371 * 2 * Math.atan2(Math.sqrt(value), Math.sqrt(1 - value));
}

export function ShelterMap({ shelters }: { shelters: Shelter[] }) {
  const mapNode = useRef<HTMLDivElement>(null), mapRef = useRef<import("leaflet").Map | null>(null);
  const [position, setPosition] = useState<Position | null>(null), [locationError, setLocationError] = useState("");
  const sorted = useMemo(() => shelters.map(shelter => ({ shelter, km: position ? distance(position, shelter) : null })).sort((a, b) => (a.km ?? 9999) - (b.km ?? 9999)), [shelters, position]);

  useEffect(() => {
    if (!mapNode.current || mapRef.current || !shelters.length) return;
    let alive = true;
    void import("leaflet").then(L => {
      if (!alive || !mapNode.current) return;
      const map = L.map(mapNode.current, { zoomControl: true }).setView([36.4, 127.8], 7);
      L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", { maxZoom: 19, attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>' }).addTo(map);
      const icon = L.divIcon({ className: "ff-map-marker-wrap", html: '<span class="ff-map-marker" aria-hidden="true">♥</span>', iconSize: [34, 40], iconAnchor: [17, 38] });
      const bounds: [number, number][] = [];
      shelters.forEach(shelter => {
        bounds.push([shelter.lat, shelter.lng]);
        const link = `/shelters/${encodeURIComponent(shelter.id)}`;
        L.marker([shelter.lat, shelter.lng], { icon, title: shelter.name, alt: shelter.name }).addTo(map).bindPopup(`<strong>${shelter.name}</strong><br>${shelter.address.split(" ").slice(0, 3).join(" ")}<br><a href="${link}">보호소 채널 보기</a>`);
      });
      if (bounds.length > 1) map.fitBounds(bounds, { padding: [28, 28], maxZoom: 12 });
      mapRef.current = map;
    });
    return () => { alive = false; mapRef.current?.remove(); mapRef.current = null; };
  }, [shelters]);

  function locate() {
    setLocationError("");
    if (!navigator.geolocation) return setLocationError("이 기기에서는 위치를 확인할 수 없어요.");
    navigator.geolocation.getCurrentPosition(({ coords }) => {
      const next = { lat: coords.latitude, lng: coords.longitude }; setPosition(next); mapRef.current?.setView([next.lat, next.lng], 11);
    }, () => setLocationError("위치 권한을 허용하면 거리순으로 볼 수 있어요."), { enableHighAccuracy: false, timeout: 8000, maximumAge: 300000 });
  }

  return <div className="ff-shelter-map-layout">
    <div><div ref={mapNode} className="ff-shelter-map" aria-label="전국 동물보호소 지도" />
      <p className="ff-meta">지도에는 공개된 보호소 주소만 표시합니다. ‘대략 위치’ 표시는 시·도 중심 좌표이며 방문 경로로 사용하면 안 됩니다.</p>
      <ActionButton onClick={locate}>{position ? "현재 위치로 다시 정렬" : "내 위치에서 가까운 순으로 보기"}</ActionButton>{locationError && <Callout tone="warning" description={locationError}/>}</div>
    <div className="ff-nearby-shelter-list">{sorted.map(({ shelter, km }) => <a href={`/shelters/${encodeURIComponent(shelter.id)}`} key={shelter.id}><div><strong>{shelter.name}</strong><p>{shelter.address}<br/>{shelter.hours}</p></div><span>{km !== null ? `${km.toFixed(km < 10 ? 1 : 0)}km` : shelter.approximateLocation ? "대략 위치" : "지도 표시"}</span></a>)}</div>
  </div>;
}
