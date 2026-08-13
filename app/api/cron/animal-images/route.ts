import { syncAnimalImages } from "../../../../lib/public-animal-store";

export const maxDuration = 300;

function authorized(request: Request) {
  const expected = (process.env.IMAGE_SYNC_TOKEN || process.env.CRON_SECRET)?.trim();
  const supplied = request.headers.get("x-sync-token")?.trim() || request.headers.get("authorization")?.replace(/^Bearer\s+/i, "").trim();
  return Boolean(expected && supplied && supplied === expected);
}

export async function GET(request: Request) {
  if (!authorized(request)) return Response.json({ error: "동기화 권한이 없습니다." }, { status: 403 });
  try {
    const result = await syncAnimalImages(100);
    if ("skipped" in result) {
      return Response.json({ ok: false, job: "animal-images", retryable: true, skipped: result.skipped }, {
        status: 409,
        headers: { "cache-control": "no-store", "x-sync-job": "animal-images", "x-sync-status": "skipped" },
      });
    }
    return Response.json({ ok: true, job: "animal-images", result, completedAt: new Date().toISOString() }, {
      headers: { "cache-control": "no-store", "x-sync-job": "animal-images", "x-sync-status": "complete" },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "이미지를 동기화하지 못했어요.";
    console.error("[animal-images-sync]", message);
    return Response.json({ ok: false, job: "animal-images", retryable: true, error: message, failedAt: new Date().toISOString() }, {
      status: 503,
      headers: { "cache-control": "no-store", "x-sync-job": "animal-images", "x-sync-status": "failed" },
    });
  }
}

export const POST = GET;
