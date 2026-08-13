import { syncPublicLostAnimals } from "../../../../lib/public-animal-store";

export const maxDuration = 300;

function authorized(request: Request) {
  const expected = process.env.CRON_SECRET?.trim();
  const supplied = request.headers.get("x-sync-token")?.trim() || request.headers.get("authorization")?.replace(/^Bearer\s+/i, "").trim();
  return Boolean(expected && supplied && supplied === expected);
}

export async function GET(request: Request) {
  if (!authorized(request)) return Response.json({ error: "동기화 권한이 없습니다." }, { status: 403 });
  try {
    const lostAnimals = await syncPublicLostAnimals();
    return Response.json({ lostAnimals }, { headers: { "cache-control": "no-store" } });
  } catch (error) {
    console.error("[public-lost-animals-sync]", error instanceof Error ? error.message : error);
    return Response.json({ error: error instanceof Error ? error.message : "실종 동물을 동기화하지 못했어요." }, { status: 503 });
  }
}

export const POST = GET;
