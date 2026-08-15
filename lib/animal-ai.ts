import { createHash } from "node:crypto";
import type { Animal } from "./data";
import { getAnimalById } from "./public-data";
import { getSupabaseServerClient } from "./supabase/server";

const MODEL_VERSION = process.env.GEMINI_MODEL?.trim() || "gemini-3.1-flash-lite";
const PROMPT_VERSION = "animal-charm-v3-seed-writing";
const MAX_RETRIES = 3;
const MAX_IMAGE_BYTES = 5 * 1024 * 1024;
const SAFE_IMAGE_HOST_SUFFIX = ".go.kr";

type SummaryRow = {
  animal_id: string;
  analysis_key: string;
  generated_summary: string | null;
  status: "pending" | "processing" | "completed" | "failed";
  model_version: string;
  source_updated_at: string;
  retry_count: number;
  next_attempt_at: string | null;
  last_error: string | null;
};

export type AnimalAiState = {
  status: SummaryRow["status"] | "unavailable" | "missing";
  summary: string | null;
  available: boolean;
};

function hasAiKey() { return Boolean(process.env.GEMINI_API_KEY?.trim()); }

function normalize(value: unknown) {
  return String(value || "").trim().replace(/\s+/g, " ");
}

function sourceInput(animal: Animal) {
  return {
    animalId: animal.id,
    imageUrl: normalize(animal.image),
    updated: normalize(animal.updated),
    species: normalize(animal.species),
    breed: normalize(animal.breed),
    age: normalize(animal.age),
    sex: normalize(animal.sex),
    colors: animal.colors.map(normalize).filter(Boolean),
    traits: animal.traits.map(normalize).filter(Boolean),
    shelterMemo: normalize(animal.summary),
  };
}

export function createAnimalAnalysisKey(animal: Animal) {
  return createHash("sha256").update(JSON.stringify({ promptVersion: PROMPT_VERSION, ...sourceInput(animal) })).digest("hex");
}

function toState(row: SummaryRow | null): AnimalAiState {
  if (!hasAiKey()) return { status: "unavailable", summary: null, available: false };
  if (!row) return { status: "missing", summary: null, available: true };
  return { status: row.status, summary: row.status === "completed" ? row.generated_summary : null, available: true };
}

export async function getAnimalAiState(animalId: string): Promise<AnimalAiState> {
  if (!hasAiKey()) return toState(null);
  const { data, error } = await getSupabaseServerClient()
    .from("public_animal_ai_summaries")
    .select("animal_id,analysis_key,generated_summary,status,model_version,source_updated_at,retry_count,next_attempt_at,last_error")
    .eq("animal_id", animalId)
    .maybeSingle();
  if (error) throw error;
  return toState((data || null) as SummaryRow | null);
}

export async function enqueueAnimalAiSummary(animal: Animal) {
  if (!hasAiKey()) return { state: toState(null), analysisKey: null };
  const client = getSupabaseServerClient();
  const analysisKey = createAnimalAnalysisKey(animal);
  const { data: existing, error: readError } = await client
    .from("public_animal_ai_summaries")
    .select("animal_id,analysis_key,generated_summary,status,model_version,source_updated_at,retry_count,next_attempt_at,last_error")
    .eq("animal_id", animal.id)
    .maybeSingle();
  if (readError) throw readError;
  const row = existing as SummaryRow | null;
  if (row?.analysis_key === analysisKey && row.status !== "failed") return { state: toState(row), analysisKey };
  if (row?.analysis_key === analysisKey && row.status === "failed" && row.retry_count >= MAX_RETRIES) return { state: toState(row), analysisKey };
  const { data, error } = await client.from("public_animal_ai_summaries").upsert({
    animal_id: animal.id,
    analysis_key: analysisKey,
    generated_summary: null,
    status: "pending",
    model_version: MODEL_VERSION,
    source_updated_at: animal.updated,
    retry_count: row?.analysis_key === analysisKey ? row.retry_count : 0,
    next_attempt_at: null,
    last_error: null,
    updated_at: new Date().toISOString(),
  }, { onConflict: "animal_id" }).select("animal_id,analysis_key,generated_summary,status,model_version,source_updated_at,retry_count,last_error").single();
  if (error) throw error;
  return { state: toState(data as SummaryRow), analysisKey };
}

function safeImageUrl(value: string) {
  let url: URL;
  try { url = new URL(value.replace(/^http:\/\//i, "https://")); } catch { return null; }
  const hostname = url.hostname.toLocaleLowerCase("en-US");
  if (url.protocol !== "https:" || url.username || url.password || url.port || (!hostname.endsWith(SAFE_IMAGE_HOST_SUFFIX) && hostname !== "go.kr")) return null;
  if (/^(localhost|127\.|10\.|192\.168\.|169\.254\.|172\.(1[6-9]|2\d|3[01])\.|0\.)/.test(hostname)) return null;
  return url.toString();
}

async function readImage(url: string) {
  let safeUrl = safeImageUrl(url);
  if (!safeUrl) throw new Error("공공 이미지 주소를 확인하지 못했어요.");

  let response: Response;
  for (let redirectCount = 0; redirectCount <= 2; redirectCount += 1) {
    response = await fetch(safeUrl, { redirect: "manual", signal: AbortSignal.timeout(8000), headers: { accept: "image/jpeg,image/png,image/webp" } });
    if (response.status < 300 || response.status >= 400) break;
    const location = response.headers.get("location");
    const redirectedUrl = location ? safeImageUrl(new URL(location, safeUrl).toString()) : null;
    if (!redirectedUrl) throw new Error("공공 이미지 리다이렉트 주소를 확인하지 못했어요.");
    safeUrl = redirectedUrl;
    if (redirectCount === 2) throw new Error("공공 이미지 리다이렉트가 너무 많아요.");
  }
  if (!response.ok) throw new Error(`공공 이미지 응답 오류(${response.status})`);
  const declaredType = response.headers.get("content-type")?.split(";", 1)[0]?.toLowerCase();
  if (!declaredType || (!["image/jpeg", "image/png", "image/webp", "application/octet-stream"].includes(declaredType))) throw new Error("지원하지 않는 이미지 형식이에요.");
  const declaredLength = Number(response.headers.get("content-length") || 0);
  if (declaredLength > MAX_IMAGE_BYTES) throw new Error("이미지가 너무 커서 분석하지 않았어요.");
  if (!response.body) throw new Error("이미지를 읽지 못했어요.");
  const reader = response.body.getReader();
  const chunks: Uint8Array[] = [];
  let total = 0;
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      total += value.byteLength;
      if (total > MAX_IMAGE_BYTES) throw new Error("이미지가 너무 커서 분석하지 않았어요.");
      chunks.push(value);
    }
  } finally { reader.releaseLock(); }
  const bytes = new Uint8Array(total);
  let offset = 0;
  for (const chunk of chunks) { bytes.set(chunk, offset); offset += chunk.byteLength; }
  const isJpeg = bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff;
  const isPng = bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4e && bytes[3] === 0x47;
  const isWebp = bytes[0] === 0x52 && bytes[1] === 0x49 && bytes[2] === 0x46 && bytes[3] === 0x46 && bytes[8] === 0x57 && bytes[9] === 0x45 && bytes[10] === 0x42 && bytes[11] === 0x50;
  if (!isJpeg && !isPng && !isWebp) throw new Error("이미지 형식을 확인하지 못했어요.");
  const type = isJpeg ? "image/jpeg" : isPng ? "image/png" : "image/webp";
  return `data:${type};base64,${Buffer.from(bytes).toString("base64")}`;
}

function extractText(payload: { candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }> }) {
  return payload.candidates?.[0]?.content?.parts?.map(part => part.text || "").join("") || "";
}

function validateSummary(value: string) {
  const summary = value.trim().replace(/^```(?:json)?|```$/g, "").trim();
  if (summary.length < 30 || summary.length > 500) return null;
  const sentenceCount = summary.split(/[.!?。！？]+/).map(value => value.trim()).filter(Boolean).length;
  if (sentenceCount < 2 || sentenceCount > 3) return null;
  if (/건강|순해요|순합니다|온순|얌전|친화|사나워요|사납|활발|성격|입양 성공|입양 가능|입양을 기다|질병|치료|회복/.test(summary)) return null;
  return summary;
}

async function generateSummary(animal: Animal) {
  const image = await readImage(animal.image);
  const input = sourceInput(animal);
  const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(MODEL_VERSION)}:generateContent`, {
    method: "POST",
    signal: AbortSignal.timeout(20000),
    headers: { "x-goog-api-key": process.env.GEMINI_API_KEY?.trim() || "", "content-type": "application/json" },
    body: JSON.stringify({
      systemInstruction: { parts: [{ text: "당신은 당근 SEED 공식 문체 기준을 따르는 보호동물 상세페이지 편집자입니다. 명확하고 간결하게, 누구나 이해할 수 있는 익숙한 단어로 쓰세요. 기술 용어·한자어·축약어·은어를 피하고, 존칭어를 과하게 사용하지 마세요. 이야기하듯 친근하고 활기차되 광고처럼 과장하거나 느낌표를 반복하지 마세요. 한 문장에는 하나의 내용만 담고 긍정문과 능동문을 사용하세요. 반드시 첨부 사진을 실제로 관찰해 털 색과 무늬, 얼굴 특징, 체형, 자세처럼 사진에서 확인되는 외형 특징을 한 가지 이상 구체적으로 담으세요. 공개 데이터는 외형 설명을 보완할 때만 사용하세요. 건강 상태, 성격, 감정, 입양 가능성, 미래 행동을 추측하거나 사실처럼 단정하지 말고, 사진에 보이지 않는 배경을 창작하지 마세요. '건강하다', '순하다', '친화적이다', '입양을 기다린다' 같은 표현은 사용하지 마세요. 한국어 2~3문장으로 이 친구의 눈에 보이는 매력을 소개하고, JSON {\"summary\":\"...\"}만 반환하세요." }] },
      contents: [{ role: "user", parts: [
        { text: `다음 공개 정보를 참고해 사진에서 보이는 외형과 보호소 메모를 중심으로 소개해 주세요. 전화번호, 주소, 개인 정보는 언급하지 마세요. ${JSON.stringify({ ...input, imageUrl: undefined })}` },
        { inlineData: { mimeType: image.slice(5, image.indexOf(";")), data: image.slice(image.indexOf(",") + 1) } },
      ] }],
      generationConfig: { temperature: 0.4, maxOutputTokens: 220, responseMimeType: "application/json" },
    }),
  });
  if (!response.ok) throw new Error(`AI 응답 오류(${response.status})`);
  const payload = await response.json() as { candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }> };
  let parsed: { summary?: string };
  try { parsed = JSON.parse(extractText(payload)) as { summary?: string }; } catch { throw new Error("AI 응답 형식을 확인하지 못했어요."); }
  const summary = validateSummary(String(parsed.summary || ""));
  if (!summary) throw new Error("AI 소개 문구를 안전하게 확인하지 못했어요.");
  return summary;
}

export async function processAnimalAiJob(animalId: string, expectedKey?: string) {
  if (!hasAiKey()) return { status: "unavailable" as const };
  const client = getSupabaseServerClient();
  const animal = await getAnimalById(animalId);
  if (!animal) return { status: "missing" as const };
  const key = createAnimalAnalysisKey(animal);
  if (expectedKey && expectedKey !== key) return { status: "stale" as const };
  const { data: current, error: readError } = await client.from("public_animal_ai_summaries").select("*").eq("animal_id", animalId).eq("analysis_key", key).maybeSingle();
  if (readError) throw readError;
  const row = current as SummaryRow | null;
  if (!row || row.status !== "pending" || row.retry_count >= MAX_RETRIES) return { status: row?.status || "missing" as const };
  const { data: claimed, error: claimError } = await client.from("public_animal_ai_summaries").update({ status: "processing", updated_at: new Date().toISOString() }).eq("animal_id", animalId).eq("analysis_key", key).eq("status", "pending").select("animal_id").maybeSingle();
  if (claimError) throw claimError;
  if (!claimed) return { status: "processing" as const };
  try {
    const summary = await generateSummary(animal);
    await client.from("public_animal_ai_summaries").update({ status: "completed", generated_summary: summary, last_error: null, updated_at: new Date().toISOString() }).eq("animal_id", animalId).eq("analysis_key", key).eq("status", "processing");
    return { status: "completed" as const, summary };
  } catch (error) {
    const message = error instanceof Error ? error.message.slice(0, 240) : "AI 소개를 만들지 못했어요.";
    const retryCount = row.retry_count + 1;
    const nextAttemptAt = retryCount < MAX_RETRIES ? new Date(Date.now() + Math.min(60 * 60 * 1000, 2 ** retryCount * 60 * 1000)).toISOString() : null;
    await client.from("public_animal_ai_summaries").update({ status: "failed", retry_count: retryCount, next_attempt_at: nextAttemptAt, last_error: message, updated_at: new Date().toISOString() }).eq("animal_id", animalId).eq("analysis_key", key).eq("status", "processing");
    console.error("[animal-ai]", animalId, message);
    return { status: "failed" as const };
  }
}

export async function processPendingAnimalAiJobs(limit = 3) {
  if (!hasAiKey()) return { processed: 0, skipped: "unavailable" };
  const { data, error } = await getSupabaseServerClient().from("public_animal_ai_summaries").select("animal_id,status,next_attempt_at,updated_at").in("status", ["pending", "failed", "processing"]).lt("retry_count", MAX_RETRIES).order("updated_at", { ascending: true }).limit(Math.min(Math.max(limit, 1), 5));
  if (error) throw error;
  let processed = 0;
  for (const row of data || []) {
    if (row.status === "failed" && row.next_attempt_at && new Date(row.next_attempt_at).getTime() > Date.now()) continue;
    if (row.status === "processing" && new Date(row.updated_at).getTime() > Date.now() - 2 * 60 * 1000) continue;
    if (row.status === "failed") {
      await getSupabaseServerClient().from("public_animal_ai_summaries").update({ status: "pending", updated_at: new Date().toISOString() }).eq("animal_id", row.animal_id).eq("status", "failed");
    }
    if (row.status === "processing") {
      await getSupabaseServerClient().from("public_animal_ai_summaries").update({ status: "pending", updated_at: new Date().toISOString() }).eq("animal_id", row.animal_id).eq("status", "processing");
    }
    await processAnimalAiJob(String(row.animal_id)); processed += 1;
  }
  return { processed };
}
