import { syncAnimalImages } from "../../../../lib/public-animal-store";

function authorized(request: Request) {
  const expected = (process.env.CRON_SECRET || process.env.PUBLIC_DATA_SYNC_TOKEN)?.trim();
  const supplied = request.headers.get("x-sync-token")?.trim() || request.headers.get("authorization")?.replace(/^Bearer\s+/i, "").trim();
  return Boolean(expected && supplied && supplied === expected);
}

export async function GET(request: Request) {
  if (!authorized(request)) return Response.json({ error: "동기화 권한이 없습니다." }, { status: 403 });
  try {
    return Response.json(await syncAnimalImages(40), { headers: { "cache-control": "no-store" } });
  } catch (error) {
    return Response.json({ error: error instanceof Error ? error.message : "이미지를 동기화하지 못했어요." }, { status: 503 });
  }
}

export const POST = GET;
