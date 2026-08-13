export type HomeLocation = { label: string; address?: string; lat: number; lng: number; source?: "ip" | "manual" };
export type GeoPoint = { lat: number; lng: number };

export function distanceMeters(a: GeoPoint, b: GeoPoint) {
  const radians = Math.PI / 180;
  const latitude = (b.lat - a.lat) * radians;
  const longitude = (b.lng - a.lng) * radians;
  const value = Math.sin(latitude / 2) ** 2
    + Math.cos(a.lat * radians) * Math.cos(b.lat * radians) * Math.sin(longitude / 2) ** 2;
  return 6371000 * 2 * Math.atan2(Math.sqrt(value), Math.sqrt(1 - value));
}

export function formatDistance(meters: number) {
  if (meters < 1000) return `${Math.max(10, Math.round(meters / 10) * 10).toLocaleString("ko-KR")}m`;
  // 해외 접속처럼 거리가 길어져도 카드와 칩의 한 줄 레이아웃을 유지합니다.
  if (meters >= 10000000) return `${(meters / 10000000).toFixed(1).replace(/\.0$/, "")}만km`;
  if (meters >= 10000) return `${Math.round(meters / 1000).toLocaleString("ko-KR")}km`;
  return `${(meters / 1000).toFixed(1)}km`;
}

export function formatDrivingDuration(seconds: number) {
  const minutes = Math.max(1, Math.round(seconds / 60));
  if (minutes < 60) return `${minutes}분`;
  const hours = Math.floor(minutes / 60);
  const remainder = minutes % 60;
  return remainder === 0 ? `${hours}시간` : `${hours}시간 ${remainder}분`;
}

export function readHomeLocation(): HomeLocation | null {
  if (typeof window === "undefined") return null;
  try {
    const value = JSON.parse(window.localStorage.getItem("ff-home-location") || window.localStorage.getItem("ff-ip-location") || "null") as HomeLocation | null;
    return value && Number.isFinite(value.lat) && Number.isFinite(value.lng) ? value : null;
  } catch {
    return null;
  }
}
