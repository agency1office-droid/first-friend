import { headers } from "next/headers";

const regionNames: Record<string, string> = {
  "KR-11": "서울시", "KR-26": "부산시", "KR-27": "대구시", "KR-28": "인천시", "KR-29": "광주시", "KR-30": "대전시", "KR-31": "울산시", "KR-36": "세종시", "KR-41": "경기도", "KR-42": "강원도", "KR-43": "충청북도", "KR-44": "충청남도", "KR-45": "전라북도", "KR-46": "전라남도", "KR-47": "경상북도", "KR-48": "경상남도", "KR-50": "제주도",
};

const cityNames: Record<string, string> = {
  Seoul: "서울", Busan: "부산", Daegu: "대구", Incheon: "인천", Gwangju: "광주", Daejeon: "대전", Ulsan: "울산", Sejong: "세종",
  "Gangnam-gu": "강남구", "Gangdong-gu": "강동구", "Gangbuk-gu": "강북구", "Gangseo-gu": "강서구", "Geumjeong-gu": "금정구",
  "Geumcheon-gu": "금천구", "Guro-gu": "구로구", "Gwanak-gu": "관악구", "Gwangjin-gu": "광진구",
  "Jongno-gu": "종로구", "Jung-gu": "중구", "Jungnang-gu": "중랑구", "Mapo-gu": "마포구",
  "Nowon-gu": "노원구", "Seocho-gu": "서초구", "Seodaemun-gu": "서대문구", "Seongbuk-gu": "성북구",
  "Seongdong-gu": "성동구", "Songpa-gu": "송파구", "Yangcheon-gu": "양천구", "Yeongdeungpo-gu": "영등포구",
  "Yongsan-gu": "용산구", "Eunpyeong-gu": "은평구", "Dongdaemun-gu": "동대문구", "Dongjak-gu": "동작구",
  "Haeundae-gu": "해운대구", "Busanjin-gu": "부산진구", "Saha-gu": "사하구", "Sasang-gu": "사상구",
  "Nam-gu": "남구", "Buk-gu": "북구", "Dong-gu": "동구", "Seo-gu": "서구",
};

const cityProvinces: Record<string, string> = {
  "Gangnam-gu": "서울시", "Gangdong-gu": "서울시", "Gangbuk-gu": "서울시", "Gangseo-gu": "서울시", "Geumcheon-gu": "서울시", "Guro-gu": "서울시", "Gwanak-gu": "서울시", "Gwangjin-gu": "서울시", "Jongno-gu": "서울시", "Jung-gu": "서울시", "Jungnang-gu": "서울시", "Mapo-gu": "서울시", "Nowon-gu": "서울시", "Seocho-gu": "서울시", "Seodaemun-gu": "서울시", "Seongbuk-gu": "서울시", "Seongdong-gu": "서울시", "Songpa-gu": "서울시", "Yangcheon-gu": "서울시", "Yeongdeungpo-gu": "서울시", "Yongsan-gu": "서울시", "Eunpyeong-gu": "서울시", "Dongdaemun-gu": "서울시", "Dongjak-gu": "서울시",
  "Haeundae-gu": "부산시", "Busanjin-gu": "부산시", "Saha-gu": "부산시", "Sasang-gu": "부산시", "Geumjeong-gu": "부산시",
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
  const province = regionNames[regionCode] || cityProvinces[city] || "";
  const translatedCity = cityNames[city] || city;
  const unknownEnglishCity = /^[A-Za-z\s-]+$/.test(translatedCity) && !cityNames[city];
  const safeCity = unknownEnglishCity && province ? province : translatedCity;
  const provinceRoot = province.replace(/(특별시|광역시|시|도)$/, "");
  const label = province && safeCity === provinceRoot ? province : province && !safeCity.includes(province) ? `${province} ${safeCity}` : safeCity;
  return Response.json({ location: { label, lat: latitude, lng: longitude, source: "ip" } }, { headers: { "cache-control": "no-store" } });
}
