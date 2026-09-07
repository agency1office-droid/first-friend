import { after } from "next/server";
import { createPublicDataFallback, enqueueAnimalAiSummary, getAnimalAiState, processAnimalAiJob } from "../../../lib/animal-ai";
import { getAnimalById } from "../../../lib/public-data";
import { beginIdempotentRequest, completeIdempotentRequest, enforceRateLimit, releaseIdempotentRequest, requestSubject } from "../../../lib/api-guards";
import { logError, requestId } from "../../../lib/observability";

export const maxDuration = 30;

function animalId(request: Request) {
  const value = new URL(request.url).searchParams.get("animalId")?.trim() || "";
  return /^[A-Za-z0-9_.: -]{1,160}$/.test(value) ? value : "";
}

function purpose(request: Request) {
  return new URL(request.url).searchParams.get("purpose") === "lost" ? "lost" as const : "adoption" as const;
}

export async function GET(request: Request) {
  const id = animalId(request);
  if (!id) return Response.json({ error: "동물 정보를 확인하지 못했어요." }, { status: 400 });
  try { return Response.json(await getAnimalAiState(id, purpose(request)), { headers: { "cache-control": "no-store" } }); }
  catch (error) { logError("animal_ai.state_read_failed", error, { requestId: requestId(request), animalId: id }); return Response.json({ status: "missing", summary: null, available: false }, { headers: { "cache-control": "no-store" } }); }
}

export async function POST(request: Request) {
  let id = "", requestedPurpose: "adoption" | "lost" = "adoption";
  let fallbackAnimal: Awaited<ReturnType<typeof getAnimalById>> = undefined;
  try { const body = await request.json() as { animalId?: unknown; purpose?: unknown }; id = String(body.animalId || "").trim(); requestedPurpose = body.purpose === "lost" ? "lost" : "adoption"; } catch { return Response.json({ error: "요청을 확인하지 못했어요." }, { status: 400 }); }
  if (!/^[A-Za-z0-9_.: -]{1,160}$/.test(id)) return Response.json({ error: "동물 정보를 확인하지 못했어요." }, { status: 400 });
  const subject = requestSubject(request);
  if (!await enforceRateLimit("animal-ai-enqueue", subject, 300, 5)) return Response.json({ error: "AI 소개 요청이 너무 많아요. 잠시 후 다시 시도해 주세요." }, { status: 429, headers: { "retry-after": "300" } });
  const guard = await beginIdempotentRequest("animal-ai-enqueue", subject, request, id);
  if (guard.kind === "replay" || guard.kind === "conflict") return guard.response;
  try {
    fallbackAnimal = await getAnimalById(id);
    if (!fallbackAnimal) return Response.json({ error: "현재 확인할 수 없는 동물이에요." }, { status: 404 });
    const queued = await enqueueAnimalAiSummary(fallbackAnimal, requestedPurpose);
    if (queued.state.status === "pending") {
      after(async () => {
        try { await processAnimalAiJob(id, queued.analysisKey || undefined, requestedPurpose); }
        // Legacy adoption flow remains equivalent to processAnimalAiJob(id, queued.analysisKey || undefined).
        catch (error) { logError("animal_ai.requested_job_failed", error, { requestId: requestId(request), animalId: id }); }
      });
    }
    if (guard.kind === "started") await completeIdempotentRequest(guard, queued.state, 200);
    return Response.json(queued.state, { headers: { "cache-control": "no-store" } });
  } catch (error) { if (guard.kind === "started") await releaseIdempotentRequest(guard); logError("animal_ai.enqueue_failed", error, { requestId: requestId(request), animalId: id }); if (fallbackAnimal) return Response.json({ status: "completed", summary: createPublicDataFallback(fallbackAnimal, requestedPurpose), available: true, source: "public-data" }, { headers: { "cache-control": "no-store" } }); return Response.json({ status: "failed", summary: null, available: false }, { headers: { "cache-control": "no-store" } }); }
}
