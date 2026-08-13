import { getNearbyAnimalsPage, syncPublicAnimals } from "../../../lib/public-animal-store";
import { PUBLIC_ANIMAL_AGE_MAX, PUBLIC_ANIMAL_WEIGHT_MAX } from "../../../lib/animal-filter-ranges";

function coordinate(value: string | null, min: number, max: number) {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed >= min && parsed <= max ? parsed : undefined;
}

export async function GET(request: Request) {
  try {
    const params = new URL(request.url).searchParams;
    const page = await getNearbyAnimalsPage({
      lat: coordinate(params.get("lat"), 30, 40),
      lng: coordinate(params.get("lng"), 120, 135),
      species: params.get("species") || "",
      publicStatus: params.get("status") || "",
      breedKeys: (params.get("breeds") || "").split(",").filter(value => /^(417000|422400):\d{6}$/.test(value)).slice(0, 10),
      ageGroup: params.get("age") || "",
      sizeGroup: params.get("size") || "",
      sex: params.get("sex") || "",
      neutered: params.get("neutered") || "",
      ageMin: Math.max(0, Math.min(PUBLIC_ANIMAL_AGE_MAX, Number(params.get("ageMin")) || 0)), ageMax: Math.max(0, Math.min(PUBLIC_ANIMAL_AGE_MAX, Number(params.get("ageMax")) || PUBLIC_ANIMAL_AGE_MAX)),
      weightMin: Math.max(0, Math.min(PUBLIC_ANIMAL_WEIGHT_MAX, Number(params.get("weightMin")) || 0)), weightMax: Math.max(0, Math.min(PUBLIC_ANIMAL_WEIGHT_MAX, Number(params.get("weightMax")) || PUBLIC_ANIMAL_WEIGHT_MAX)),
      color: params.get("color") || "",
      sort: params.get("sort") || "",
      maxDistance: Math.max(0, Number(params.get("maxDistance")) || 0),
      multiplePhotos: params.get("multiplePhotos") === "1",
      exactLocation: params.get("exactLocation") === "1",
      cursor: params.get("cursor"),
      limit: Math.min(50, Math.max(1, Number(params.get("limit")) || 20)),
    });
    return Response.json(page, { headers: { "cache-control": "public, s-maxage=30, stale-while-revalidate=120" } });
  } catch (error) {
    return Response.json({ error: error instanceof Error ? error.message : "보호동물 정보를 불러오지 못했어요." }, { status: 503 });
  }
}

export async function POST(request: Request) {
  const host = new URL(request.url).hostname;
  const token = process.env.PUBLIC_DATA_SYNC_TOKEN?.trim();
  const supplied = request.headers.get("x-sync-token")?.trim();
  if (host !== "localhost" && host !== "127.0.0.1" && (!token || supplied !== token)) {
    return Response.json({ error: "동기화 권한이 없습니다." }, { status: 403 });
  }
  try {
    return Response.json(await syncPublicAnimals());
  } catch (error) {
    return Response.json({ error: error instanceof Error ? error.message : "동기화하지 못했어요." }, { status: 503 });
  }
}
