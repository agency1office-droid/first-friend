function coordinate(value: unknown, minimum: number, maximum: number) {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed >= minimum && parsed <= maximum ? parsed : null;
}

export async function GET(request: Request) {
  const key = process.env.KAKAO_REST_API_KEY?.trim();
  const query = new URL(request.url).searchParams.get("q")?.trim().slice(0, 180) || "";
  if (!key || !query) return Response.json({ coordinates: null }, { status: 400 });
  try {
    const queries = [query, query.split(" ").slice(0, 2).join(" ")].filter((value, index, values) => value && values.indexOf(value) === index);
    let document: { x?: string; y?: string } | undefined;
    for (const candidate of queries) {
      const url = new URL("https://dapi.kakao.com/v2/local/search/address.json");
      url.searchParams.set("query", candidate);
      url.searchParams.set("analyze_type", "similar");
      url.searchParams.set("size", "1");
      const response = await fetch(url, { headers: { Authorization: `KakaoAK ${key}` }, cache: "no-store", signal: AbortSignal.timeout(5000) });
      if (!response.ok) continue;
      document = (await response.json() as { documents?: Array<{ x?: string; y?: string }> }).documents?.[0];
      if (document) break;
    }
    const lng = coordinate(document?.x, 120, 135), lat = coordinate(document?.y, 30, 40);
    return Response.json({ coordinates: lat !== null && lng !== null ? { lat, lng } : null }, { headers: { "cache-control": "public, max-age=86400" } });
  } catch {
    return Response.json({ coordinates: null }, { status: 502 });
  }
}
