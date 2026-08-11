type KakaoPlace = {
  place_name?: string;
  distance?: string;
  place_url?: string;
};

function coordinate(value: string | null, minimum: number, maximum: number) {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed >= minimum && parsed <= maximum ? parsed : null;
}

function json(body: object, status = 200) {
  return Response.json(body, {
    status,
    headers: { "cache-control": status === 200 ? "public, max-age=3600" : "no-store" },
  });
}

export async function GET(request: Request) {
  const key = process.env.KAKAO_REST_API_KEY?.trim();
  if (!key) return json({ station: null, reason: "not_configured" }, 503);

  const params = new URL(request.url).searchParams;
  const lat = coordinate(params.get("lat"), -90, 90);
  const lng = coordinate(params.get("lng"), -180, 180);
  if (lat === null || lng === null) return json({ station: null, reason: "invalid_coordinates" }, 400);

  const upstream = new URL("https://dapi.kakao.com/v2/local/search/category.json");
  upstream.searchParams.set("category_group_code", "SW8");
  upstream.searchParams.set("x", String(lng));
  upstream.searchParams.set("y", String(lat));
  upstream.searchParams.set("radius", "5000");
  upstream.searchParams.set("sort", "distance");
  upstream.searchParams.set("size", "1");

  try {
    const response = await fetch(upstream, {
      headers: { Authorization: `KakaoAK ${key}` },
      cache: "no-store",
      signal: AbortSignal.timeout(5000),
    });
    if (!response.ok) return json({ station: null, reason: "upstream_error" }, 502);

    const data = await response.json() as { documents?: KakaoPlace[] };
    const place = data.documents?.[0];
    const distanceMeters = Number(place?.distance);
    if (!place?.place_name) return json({ station: null, reason: "not_found" }, 404);

    return json({
      station: {
        name: place.place_name,
        distanceMeters: Number.isFinite(distanceMeters) ? distanceMeters : null,
        url: place.place_url || null,
      },
    });
  } catch {
    return json({ station: null, reason: "request_failed" }, 502);
  }
}
