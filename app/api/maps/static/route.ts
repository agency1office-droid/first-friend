function coordinate(value: string | null, min: number, max: number) {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed >= min && parsed <= max ? parsed : null;
}

export async function GET(request: Request) {
  const params = new URL(request.url).searchParams;
  const lat = coordinate(params.get("lat"), 30, 40);
  const lng = coordinate(params.get("lng"), 120, 135);
  const key = process.env.KAKAO_REST_API_KEY?.trim();
  if (!key || lat === null || lng === null) return new Response(null, { status: 400 });

  const upstream = new URL("https://dapi.kakao.com/v2/maps/staticmap");
  upstream.searchParams.set("size", "640x360");
  upstream.searchParams.set("scale", "2");
  upstream.searchParams.set("format", "png");
  upstream.searchParams.set("logo_pos", "bottom_right");
  upstream.searchParams.append("markers", `location:${lng},${lat}|option:false`);
  upstream.searchParams.set("center", `${lng},${lat}`);
  upstream.searchParams.set("lv", "3");

  const response = await fetch(upstream, {
    headers: { Authorization: `KakaoAK ${key}` },
    cache: "no-store",
    signal: AbortSignal.timeout(6000),
  });
  if (!response.ok) return new Response(null, { status: response.status });
  return new Response(response.body, {
    headers: {
      "content-type": response.headers.get("content-type") || "image/png",
      "cache-control": "private, max-age=600",
    },
  });
}
