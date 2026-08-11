type KakaoDirectionsResponse = {
  routes?: Array<{
    result_code?: number;
    result_msg?: string;
    summary?: { distance?: number; duration?: number };
  }>;
};

function coordinate(value: string | null, minimum: number, maximum: number) {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed >= minimum && parsed <= maximum ? parsed : null;
}

function json(body: object, status = 200) {
  return Response.json(body, {
    status,
    headers: { "cache-control": status === 200 ? "private, max-age=300" : "no-store" },
  });
}

export async function GET(request: Request) {
  const key = process.env.KAKAO_REST_API_KEY?.trim();
  if (!key) return json({ available: false, reason: "not_configured" }, 503);

  const params = new URL(request.url).searchParams;
  const originLat = coordinate(params.get("originLat"), -90, 90);
  const originLng = coordinate(params.get("originLng"), -180, 180);
  const destinationLat = coordinate(params.get("destinationLat"), -90, 90);
  const destinationLng = coordinate(params.get("destinationLng"), -180, 180);
  if (originLat === null || originLng === null || destinationLat === null || destinationLng === null) {
    return json({ available: false, reason: "invalid_coordinates" }, 400);
  }

  const upstream = new URL("https://apis-navi.kakaomobility.com/v1/directions");
  upstream.searchParams.set("origin", `${originLng},${originLat}`);
  upstream.searchParams.set("destination", `${destinationLng},${destinationLat}`);
  upstream.searchParams.set("priority", "RECOMMEND");
  upstream.searchParams.set("summary", "true");

  try {
    const response = await fetch(upstream, {
      headers: {
        Authorization: `KakaoAK ${key}`,
        "Content-Type": "application/json",
      },
      cache: "no-store",
      signal: AbortSignal.timeout(8000),
    });
    if (!response.ok) return json({ available: false, reason: "upstream_error" }, 502);

    const data = await response.json() as KakaoDirectionsResponse;
    const route = data.routes?.find((item) => item.result_code === 0 && item.summary);
    const durationSeconds = route?.summary?.duration;
    const routeDistanceMeters = route?.summary?.distance;
    if (!Number.isFinite(durationSeconds) || !Number.isFinite(routeDistanceMeters)) {
      return json({ available: false, reason: "route_not_found" }, 404);
    }

    return json({
      available: true,
      durationSeconds,
      routeDistanceMeters,
    });
  } catch {
    return json({ available: false, reason: "request_failed" }, 502);
  }
}
