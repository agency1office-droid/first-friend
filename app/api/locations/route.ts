type KakaoAddressDocument = {
  address_name: string;
  x: string;
  y: string;
  address?: {
    region_1depth_name?: string;
    region_2depth_name?: string;
    region_3depth_h_name?: string;
    region_3depth_name?: string;
  };
};

type KakaoKeywordDocument = {
  address_name: string;
  road_address_name: string;
  place_name: string;
  x: string;
  y: string;
};

function normalizeLabel(document: KakaoAddressDocument) {
  const address = document.address;
  return [
    address?.region_1depth_name,
    address?.region_2depth_name,
    address?.region_3depth_h_name || address?.region_3depth_name,
  ]
    .filter(Boolean)
    .join(" ") || document.address_name.split(" ").slice(0, 3).join(" ");
}

export async function GET(request: Request) {
  const query = new URL(request.url).searchParams.get("q")?.trim().slice(0, 60) || "";
  if (query.length < 2) return Response.json({ locations: [] });
  const key = process.env.KAKAO_REST_API_KEY?.trim();
  if (!key) return Response.json({ error: "지역 검색 키가 설정되지 않았습니다." }, { status: 503 });

  const headers = { Authorization: `KakaoAK ${key}` };
  const addressUrl = new URL("https://dapi.kakao.com/v2/local/search/address.json");
  addressUrl.searchParams.set("query", query);
  addressUrl.searchParams.set("size", "20");
  const addressResponse = await fetch(addressUrl, { headers, cache: "no-store", signal: AbortSignal.timeout(5000) });
  const addressPayload = addressResponse.ok
    ? await addressResponse.json() as { documents?: KakaoAddressDocument[] }
    : { documents: [] };

  let locations = (addressPayload.documents || []).map((document) => ({
    label: normalizeLabel(document),
    address: document.address_name,
    lat: Number(document.y),
    lng: Number(document.x),
  }));

  if (!locations.length) {
    const keywordUrl = new URL("https://dapi.kakao.com/v2/local/search/keyword.json");
    keywordUrl.searchParams.set("query", `${query} 주민센터`);
    keywordUrl.searchParams.set("size", "10");
    const keywordResponse = await fetch(keywordUrl, { headers, cache: "no-store", signal: AbortSignal.timeout(5000) });
    const keywordPayload = keywordResponse.ok
      ? await keywordResponse.json() as { documents?: KakaoKeywordDocument[] }
      : { documents: [] };
    locations = (keywordPayload.documents || []).map((document) => ({
      label: (document.address_name || document.road_address_name).split(" ").slice(0, 3).join(" "),
      address: document.address_name || document.road_address_name || document.place_name,
      lat: Number(document.y),
      lng: Number(document.x),
    }));
  }

  const seen = new Set<string>();
  return Response.json({
    locations: locations
      .filter((location) => Number.isFinite(location.lat) && Number.isFinite(location.lng))
      .filter((location) => !seen.has(location.label) && seen.add(location.label))
      .slice(0, 12),
  });
}
