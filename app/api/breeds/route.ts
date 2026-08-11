import { getPublicBreeds } from "../../../lib/public-breeds";
import { getBreedCounts } from "../../../lib/public-animal-store";

type BreedFacet = { count: number; kindNm: string; species: "dog" | "cat" };
const countCache = new Map<string, { expiresAt: number; counts: Record<string, BreedFacet> }>();

function coordinate(value: string | null, min: number, max: number) {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed >= min && parsed <= max ? parsed : undefined;
}

export async function GET(request: Request) {
  try {
    const params = new URL(request.url).searchParams;
    const value = params.get("species");
    const species = value === "dog" || value === "cat" ? value : "all";
    const officialItems = await getPublicBreeds(species);
    const cacheKey = params.toString(), cached = countCache.get(cacheKey);
    let counts = cached?.expiresAt && cached.expiresAt > Date.now() ? cached.counts : undefined;
    if (!counts) {
      counts = await getBreedCounts({
        lat: coordinate(params.get("lat"), 30, 40),
        lng: coordinate(params.get("lng"), 120, 135),
        publicStatus: params.get("status") || "",
        ageGroup: params.get("age") || "",
        sizeGroup: params.get("size") || "",
        sex: params.get("sex") || "",
        maxDistance: Math.max(0, Number(params.get("maxDistance")) || 0),
      });
      countCache.set(cacheKey, { counts, expiresAt: Date.now() + 30_000 });
      if (countCache.size > 100) for (const [key, entry] of countCache) if (entry.expiresAt <= Date.now()) countCache.delete(key);
    }
    const officialKeys = new Set(officialItems.map(item => item.key));
    const observedItems = Object.entries(counts).filter(([key, facet]) => !officialKeys.has(key) && (species === "all" || facet.species === species)).map(([key, facet]) => {
      const [upKindCd, kindCd] = key.split(":");
      return { key, upKindCd, kindCd, kindNm: facet.kindNm, species: facet.species, count: facet.count };
    });
    const items = [...officialItems.map(item => ({ ...item, count: counts[item.key]?.count || 0 })), ...observedItems].sort((a, b) => a.kindNm.localeCompare(b.kindNm, "ko-KR"));
    return Response.json({ items, total: items.length }, { headers: { "cache-control": "private, max-age=30" } });
  } catch (error) {
    return Response.json({ error: error instanceof Error ? error.message : "품종 목록을 불러오지 못했어요." }, { status: 503 });
  }
}
