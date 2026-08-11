type KakaoAddress = {
  address_name?: string;
};

type KakaoRoadAddress = {
  address_name?: string;
  zone_no?: string;
};

type KakaoAddressDocument = {
  address_name?: string;
  address?: KakaoAddress | null;
  road_address?: KakaoRoadAddress | null;
};

function coordinate(value: string | null, minimum: number, maximum: number) {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed >= minimum && parsed <= maximum ? parsed : null;
}

function response(body: object, status = 200) {
  return Response.json(body, {
    status,
    headers: { "cache-control": status === 200 ? "public, max-age=86400" : "no-store" },
  });
}

function details(document?: KakaoAddressDocument) {
  if (!document) return null;
  const roadAddress = document.road_address?.address_name?.trim() || null;
  const lotAddress = document.address?.address_name?.trim() || document.address_name?.trim() || null;
  const postalCode = document.road_address?.zone_no?.trim() || null;
  return roadAddress || lotAddress ? { roadAddress, lotAddress, postalCode } : null;
}

async function kakao(url: URL, key: string) {
  const upstream = await fetch(url, {
    headers: { Authorization: `KakaoAK ${key}` },
    cache: "no-store",
    signal: AbortSignal.timeout(5000),
  });
  if (!upstream.ok) return null;
  return upstream.json() as Promise<{ documents?: KakaoAddressDocument[] }>;
}

export async function GET(request: Request) {
  const key = process.env.KAKAO_REST_API_KEY?.trim();
  if (!key) return response({ address: null, reason: "not_configured" }, 503);

  const params = new URL(request.url).searchParams;
  const query = params.get("q")?.trim().slice(0, 180) || "";
  const lat = coordinate(params.get("lat"), -90, 90);
  const lng = coordinate(params.get("lng"), -180, 180);

  try {
    if (query && query !== "주소 정보 없음") {
      const search = new URL("https://dapi.kakao.com/v2/local/search/address.json");
      search.searchParams.set("query", query);
      search.searchParams.set("analyze_type", "similar");
      search.searchParams.set("size", "1");
      const result = details((await kakao(search, key))?.documents?.[0]);
      if (result) return response({ address: result });
    }

    if (lat !== null && lng !== null) {
      const reverse = new URL("https://dapi.kakao.com/v2/local/geo/coord2address.json");
      reverse.searchParams.set("x", String(lng));
      reverse.searchParams.set("y", String(lat));
      reverse.searchParams.set("input_coord", "WGS84");
      const result = details((await kakao(reverse, key))?.documents?.[0]);
      if (result) return response({ address: result });
    }

    return response({ address: null, reason: "not_found" }, 404);
  } catch {
    return response({ address: null, reason: "request_failed" }, 502);
  }
}
