import { processPendingAnimalAiJobs } from "../../../../lib/animal-ai";

export const maxDuration = 60;

function authorized(request: Request) {
  const expected = process.env.CRON_SECRET?.trim();
  const supplied = request.headers.get("x-sync-token")?.trim() || request.headers.get("authorization")?.replace(/^Bearer\s+/i, "").trim();
  return Boolean(expected && supplied && supplied === expected);
}

export async function GET(request: Request) {
  if (!authorized(request)) return Response.json({ error: "동기화 권한이 없습니다." }, { status: 403 });
  try { return Response.json({ ok: true, job: "animal-ai", ...(await processPendingAnimalAiJobs(3)), completedAt: new Date().toISOString() }, { headers: { "cache-control": "no-store" } }); }
  catch (error) { const message = error instanceof Error ? error.message : "AI 소개 작업을 처리하지 못했어요."; console.error("[animal-ai-cron]", message); return Response.json({ ok: false, job: "animal-ai", error: message }, { status: 503, headers: { "cache-control": "no-store" } }); }
}

export const POST = GET;
