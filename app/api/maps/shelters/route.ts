import { getShelters } from "../../../../lib/public-data";

export async function GET() {
  const key = process.env.KAKAO_REST_API_KEY?.trim();
  if (!key) return new Response(null, { status: 400 });

  const shelters = await getShelters(100);
  if (!shelters.length) return new Response(null, { status: 404 });

  const upstream = new URL("https://dapi.kakao.com/v2/maps/staticmap");
  upstream.searchParams.set("size", "640x640");
  upstream.searchParams.set("scale", "2");
  upstream.searchParams.set("format", "png");
  upstream.searchParams.set("logo_pos", "bottom_right");
  for (const shelter of shelters.slice(0, 100)) {
    upstream.searchParams.append("markers", `location:${shelter.lng},${shelter.lat}|option:false`);
  }

  const response = await fetch(upstream, {
    headers: { Authorization: `KakaoAK ${key}` },
    cache: "no-store",
    signal: AbortSignal.timeout(8000),
  });
  if (!response.ok) return new Response(null, { status: response.status });
  return new Response(response.body, {
    headers: {
      "content-type": response.headers.get("content-type") || "image/png",
      "cache-control": "private, max-age=600",
    },
  });
}
