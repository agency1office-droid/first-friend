import { headers } from "next/headers";

const regionNames: Record<string, string> = {
  "KR-11": "서울", "KR-26": "부산", "KR-27": "대구", "KR-28": "인천", "KR-29": "광주", "KR-30": "대전", "KR-31": "울산", "KR-36": "세종", "KR-41": "경기", "KR-42": "강원", "KR-43": "충북", "KR-44": "충남", "KR-45": "전북", "KR-46": "전남", "KR-47": "경북", "KR-48": "경남", "KR-50": "제주",
};

function text(value: string | null) {
  try { return value ? decodeURIComponent(value).trim() : ""; } catch { return value?.trim() || ""; }
}

export async function GET() {
  const requestHeaders = await headers();
  const city = text(requestHeaders.get("x-vercel-ip-city"));
  const regionCode = text(requestHeaders.get("x-vercel-ip-country-region"));
  const latitude = Number(requestHeaders.get("x-vercel-ip-latitude"));
  const longitude = Number(requestHeaders.get("x-vercel-ip-longitude"));
  if (!city || !Number.isFinite(latitude) || !Number.isFinite(longitude)) return Response.json({ location: null });
  const province = regionNames[regionCode] || "";
  const label = province && !city.includes(province) ? `${province} ${city}` : city;
  return Response.json({ location: { label, lat: latitude, lng: longitude, source: "ip" } }, { headers: { "cache-control": "private, max-age=3600" } });
}
