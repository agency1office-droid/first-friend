import { getPublicRawFilterOptions } from "../../../lib/public-animal-store";

export async function GET() {
  try {
    return Response.json(await getPublicRawFilterOptions(), { headers: { "cache-control": "public, s-maxage=300, stale-while-revalidate=900" } });
  } catch (error) {
    return Response.json({ error: error instanceof Error ? error.message : "공공 API 필터를 불러오지 못했어요." }, { status: 503 });
  }
}
