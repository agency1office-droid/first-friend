import { syncPublicAnimals } from "../../../../lib/public-animal-store";

export const maxDuration = 300;

function authorized(request: Request) {
  const expected = (process.env.CRON_SECRET || process.env.PUBLIC_DATA_SYNC_TOKEN)?.trim();
  const supplied = request.headers.get("x-sync-token")?.trim() || request.headers.get("authorization")?.replace(/^Bearer\s+/i, "").trim();
  return Boolean(expected && supplied && supplied === expected);
}

export async function GET(request: Request) {
  if (!authorized(request)) return Response.json({ error: "동기화 권한이 없습니다." }, { status: 403 });
  try {
    const animals = await syncPublicAnimals();
    return Response.json({ animals }, { headers: { "cache-control": "no-store" } });
  } catch (error) {
    console.error("[public-animals-sync]", error instanceof Error ? error.message : error);
    return Response.json({ error: error instanceof Error ? error.message : "동기화하지 못했어요." }, { status: 503 });
  }
}

export const POST = GET;
