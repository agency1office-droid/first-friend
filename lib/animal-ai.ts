import { createHash } from "node:crypto";
import type { Animal } from "./data";
import { getAnimalById } from "./public-data";
import { getSupabaseServerClient } from "./supabase/server";

const MODEL_VERSION = process.env.GEMINI_MODEL?.trim() || "gemini-3.1-flash-lite";
const PROMPT_VERSION = "animal-charm-v7-first-friend-ux-writing";
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
  source?: "ai" | "public-data";
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
  return { status: row.status, summary: row.status === "completed" ? row.generated_summary : null, available: true, source: row.model_version === "public-data-fallback-v1" ? "public-data" : "ai" };
}

export async function getAnimalAiState(animalId: string): Promise<AnimalAiState> {
  if (!hasAiKey()) return toState(null);
  const { data, error } = await getSupabaseServerClient()
    .from("public_animal_ai_summaries")
    .select("animal_id,analysis_key,generated_summary,status,model_version,source_updated_at,retry_count,next_attempt_at,last_error")
    .eq("animal_id", animalId)
    .maybeSingle();
  if (error) throw error;
  const row = (data || null) as SummaryRow | null;
  const animal = await getAnimalById(animalId);
  if (!animal) return toState(row);
  if (!row || row.analysis_key !== createAnimalAnalysisKey(animal)) return toState(null);
  return toState(row);
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
  return payload.candidates?.[0]?.content?.parts?.map(part => part.text || "").join("").trim() || "";
}

type SummaryValidation = { summary: string | null; reason?: string };

function validateSummary(value: string): SummaryValidation {
  const summary = value.replace(/^```(?:json)?\s*|```$/g, "").replace(/\s+/g, " ").trim();
  if (summary.length < 20) return { summary: null, reason: "문구가 너무 짧아요." };
  if (summary.length > 600) return { summary: null, reason: "문구가 너무 길어요." };
  const sentenceCount = summary.split(/[.!?。！？]+/).map(item => item.trim()).filter(Boolean).length;
  if (sentenceCount < 1 || sentenceCount > 4) return { summary: null, reason: "문장 수가 기준을 벗어났어요." };
  if (/01[016789][-\s]?\d{3,4}[-\s]?\d{4}|https?:\/\/|www\.|@[\w.-]+/.test(summary)) return { summary: null, reason: "연락처나 외부 주소가 포함됐어요." };
  if (/건강|순해요|순합니다|온순|얌전|친화|사나워요|사납|활발|성격|입양 성공|입양 가능|입양을 기다|보호소에서|질병|치료|회복|불쌍|애타게|반드시 입양/.test(summary)) return { summary: null, reason: "건강·성격·입양을 추측하는 표현이 포함됐어요." };
  return { summary };
}

function parseSummary(value: string) {
  const raw = value.trim().replace(/^```(?:json)?\s*|```$/g, "").trim();
  try {
    const parsed = JSON.parse(raw) as { summary?: unknown };
    return typeof parsed.summary === "string" ? parsed.summary : raw;
  } catch {
    return raw;
  }
}

async function generateSummary(animal: Animal) {
  const image = await readImage(animal.image);
  const input = sourceInput(animal);
  const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(MODEL_VERSION)}:generateContent`, {
    method: "POST",
    signal: AbortSignal.timeout(20000),
    headers: { "x-goog-api-key": process.env.GEMINI_API_KEY?.trim() || "", "content-type": "application/json" },
    body: JSON.stringify({
      systemInstruction: { parts: [{ text: "당신은 퍼스트프렌드의 반려동물 소개 문구를 작성하는 UX 라이팅 AI입니다. 당근의 친근함과 토스의 간결함을 참고하되, 두 브랜드의 문구를 그대로 따라 하지 말고 퍼스트프렌드만의 따뜻하고 담백한 친구 소개 말투를 사용하세요. 사용자를 존중하는 친근한 존댓말을 쓰고, 짧고 자연스러운 문장으로 작성하세요. 어려운 전문용어와 보고서 표현을 피하세요. 문장 끝은 '고양이예요', '강아지예요', '~처럼 보여요', '~한 모습이에요'처럼 자연스러운 '-요' 표현을 우선하고 '입니다', '합니다' 문체는 사용하지 마세요. 먼저 사진에서 확인되는 털 색·무늬·눈매·표정·자세를 구체적으로 말한 다음, 그 특징이 왜 귀엽고 예쁘고 매력적인지 감상하는 문장을 반드시 한 문장 넣으세요. 본문에는 '귀여운 포인트예요', '예쁜 무늬가 돋보여요', '매력이 느껴져요' 중 사진에 맞는 표현을 최소 한 번 사용하세요. 예를 들어 하얀 앞발이 양말을 신은 듯 보여 귀여운 포인트라고 말하거나, 색과 무늬가 어우러져 예쁘다고 말할 수 있어요. 단, 사진에 실제로 보이는 특징에 근거하고 모든 동물을 똑같이 칭찬하거나 과장하지 마세요. 매력에 대한 감상은 외형에만 한정하고 성격·건강·감정으로 확장하지 마세요. 과도하게 귀엽거나 감정적인 표현, 동정심을 유도하는 표현, 과장된 감탄사를 사용하지 마세요. 본문 2~3문장은 모두 사진 속 외형·무늬·표정·자세와 그에 대한 근거 있는 감상으로 쓰고, 보호소 상태나 입양 안내는 본문에 넣지 마세요. 공개 데이터는 종·품종·나이처럼 확인된 정보를 보완할 때만 사용하세요. 건강·성격·입양 가능 여부·미래 행동을 추측하거나 사실처럼 단정하지 말고, '불쌍한 아이', '주인을 애타게 기다려요', '순하고 착해요', '건강해 보여요', '반드시 입양해야 해요' 같은 표현은 사용하지 마세요. 출력에는 제목이나 안내 문구를 넣지 말고, UI에 표시할 본문만 한국어 2~3문장으로 JSON {\"summary\":\"...\"} 형식으로 반환하세요." }] },
      contents: [{ role: "user", parts: [
        { text: `다음 공개 정보를 참고해 사진에서 보이는 외형과 보호소 메모를 중심으로 소개해 주세요. 전화번호, 주소, 개인 정보는 언급하지 마세요. ${JSON.stringify({ ...input, imageUrl: undefined })}` },
        { inlineData: { mimeType: image.slice(5, image.indexOf(";")), data: image.slice(image.indexOf(",") + 1) } },
      ] }],
      generationConfig: { temperature: 0.4, maxOutputTokens: 220, responseMimeType: "application/json" },
    }),
  });
  if (!response.ok) throw new Error(`AI 응답 오류(${response.status})`);
  const payload = await response.json() as { candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }> };
  const validation = validateSummary(parseSummary(extractText(payload)));
  if (!validation.summary) throw new Error(`AI 소개 검증 실패: ${validation.reason || "문구를 확인하지 못했어요."}`);
  return validation.summary;
}

function createPublicDataFallback(animal: Animal) {
  const appearance = [animal.colors.filter(Boolean).join("·"), animal.breed !== "품종 미상" ? animal.breed : ""].filter(Boolean).join(" 털과 ");
  const detail = appearance ? `${appearance}이 눈에 띄고` : "사진 속 모습이 인상적이고";
  return `${detail} 사진 속 표정과 자세에서 이 친구만의 매력이 느껴져요. 공개된 정보와 사진을 천천히 살펴보며 함께할 모습을 상상해 보세요.`;
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
    const fallback = createPublicDataFallback(animal);
    await client.from("public_animal_ai_summaries").update({ status: "completed", generated_summary: fallback, model_version: "public-data-fallback-v1", retry_count: retryCount, next_attempt_at: nextAttemptAt, last_error: message, updated_at: new Date().toISOString() }).eq("animal_id", animalId).eq("analysis_key", key).eq("status", "processing");
    console.error("[animal-ai]", animalId, message);
    return { status: "completed" as const, summary: fallback, source: "public-data" as const };
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
