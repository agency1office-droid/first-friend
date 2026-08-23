import { enqueueAnimalAiSummary, getAnimalAiState } from "../../../lib/animal-ai";
import { getAnimalById } from "../../../lib/public-data";

export const maxDuration = 30;

function animalId(request: Request) {
  const value = new URL(request.url).searchParams.get("animalId")?.trim() || "";
  return /^[A-Za-z0-9_-]{1,80}$/.test(value) ? value : "";
}

export async function GET(request: Request) {
  const id = animalId(request);
  if (!id) return Response.json({ error: "동물 정보를 확인하지 못했어요." }, { status: 400 });
  try { return Response.json(await getAnimalAiState(id), { headers: { "cache-control": "no-store" } }); }
  catch (error) { console.error("[animal-ai-state]", error); return Response.json({ status: "missing", summary: null, available: false }, { headers: { "cache-control": "no-store" } }); }
}

export async function POST(request: Request) {
  let id = "";
  try { id = String((await request.json() as { animalId?: unknown }).animalId || "").trim(); } catch { return Response.json({ error: "요청을 확인하지 못했어요." }, { status: 400 }); }
  if (!/^[A-Za-z0-9_-]{1,80}$/.test(id)) return Response.json({ error: "동물 정보를 확인하지 못했어요." }, { status: 400 });
  try {
    const animal = await getAnimalById(id);
    if (!animal) return Response.json({ error: "현재 확인할 수 없는 동물이에요." }, { status: 404 });
    const queued = await enqueueAnimalAiSummary(animal);
    return Response.json(queued.state, { headers: { "cache-control": "no-store" } });
  } catch (error) { console.error("[animal-ai-enqueue]", error); return Response.json({ status: "failed", summary: null, available: false }, { headers: { "cache-control": "no-store" } }); }
}
