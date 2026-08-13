import { syncPublicAnimals } from "../../../../lib/public-animal-store";

export const maxDuration = 300;

function authorized(request: Request) {
  const expected = process.env.CRON_SECRET?.trim();
  const supplied = request.headers.get("x-sync-token")?.trim() || request.headers.get("authorization")?.replace(/^Bearer\s+/i, "").trim();
  return Boolean(expected && supplied && supplied === expected);
}

export async function GET(request: Request) {
  if (!authorized(request)) return Response.json({ error: "동기화 권한이 없습니다." }, { status: 403 });
  try {
    const animals = await syncPublicAnimals();
    return Response.json({ ok: true, job: "public-animals", animals, completedAt: new Date().toISOString() }, {
      headers: { "cache-control": "no-store", "x-sync-job": "public-animals", "x-sync-status": "complete" },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "동기화하지 못했어요.";
    console.error("[public-animals-sync]", message);
    return Response.json({ ok: false, job: "public-animals", retryable: true, error: message, failedAt: new Date().toISOString() }, {
      status: 503,
      headers: { "cache-control": "no-store", "x-sync-job": "public-animals", "x-sync-status": "failed" },
    });
  }
}

export const POST = GET;
