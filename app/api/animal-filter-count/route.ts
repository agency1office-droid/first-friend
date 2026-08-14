export async function GET(request: Request) {
  try {
    const params = new URL(request.url).searchParams;
    // 개체수는 별도 필터 로직으로 다시 계산하지 않고, 실제 목록 API와
    // 같은 검색 경로의 total을 사용합니다. 그래야 원문 나이/품종 보정,
    // DB RPC와 fallback의 차이 때문에 목록과 숫자가 어긋나지 않습니다.
    const feedUrl = new URL(request.url);
    feedUrl.pathname = "/api/animals";
    feedUrl.searchParams.delete("ageGroup");
    feedUrl.searchParams.delete("breedKeys");
    feedUrl.searchParams.delete("sizeGroup");
    feedUrl.searchParams.delete("publicStatus");
    feedUrl.searchParams.set("age", params.get("ageGroup") || "");
    feedUrl.searchParams.set("breeds", params.get("breedKeys") || "");
    feedUrl.searchParams.set("size", params.get("sizeGroup") || "");
    feedUrl.searchParams.set("status", params.get("publicStatus") || "");
    feedUrl.searchParams.set("limit", "1");
    feedUrl.searchParams.set("sort", "recent");
    const response = await fetch(feedUrl, { cache: "no-store" });
    if (!response.ok) throw new Error(`목록을 조회하지 못했어요. (${response.status})`);
    const result = await response.json() as { total?: number };
    return Response.json({ count: Number(result.total) || 0 }, { headers: { "cache-control": "no-store" } });
  } catch (error) {
    return Response.json({ error: error instanceof Error ? error.message : "조건에 맞는 친구 수를 계산하지 못했어요." }, { status: 503 });
  }
}
