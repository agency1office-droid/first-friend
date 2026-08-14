import { getNearbyAnimalsPage } from "../../../lib/public-animal-store";

const list = (value: string | null) => value ? value.split(",").map(item => item.trim()).filter(Boolean) : [];

export async function GET(request: Request) {
  try {
    const params = new URL(request.url).searchParams;
    const result = await getNearbyAnimalsPage({
      species: params.get("species") || "all",
      breedKeys: list(params.get("breedKeys")),
      sex: params.get("sex") || "all",
      neutered: params.get("neutered") || "all",
      ageGroup: params.get("ageGroup") || "all",
      sizeGroup: params.get("sizeGroup") || "all",
      color: params.get("color") || "all",
      publicStatus: params.get("publicStatus") || "all",
      sort: "recent",
      limit: 1,
    });
    return Response.json({ count: result.total }, { headers: { "cache-control": "no-store" } });
  } catch (error) {
    return Response.json({ error: error instanceof Error ? error.message : "조건에 맞는 친구 수를 계산하지 못했어요." }, { status: 503 });
  }
}
