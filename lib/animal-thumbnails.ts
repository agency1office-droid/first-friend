import { createHash } from "node:crypto";
import { getSupabaseServerClient } from "./supabase/server";
import { hasAllowedFileSignature } from "./supabase/storage";

const MAX_BYTES = 10 * 1024 * 1024;

export function thumbnailSource(value: string) {
  const url = new URL(value.replace(/^http:/i, "https:"));
  if (url.protocol !== "https:" || url.hostname !== "openapi.animal.go.kr" || url.port || url.username || url.password) throw new Error("허용되지 않은 사진 주소예요.");
  return url;
}

export async function createAnimalThumbnail(source: string) {
  const response = await fetch(thumbnailSource(source), { redirect: "error", signal: AbortSignal.timeout(15000) });
  if (!response.ok || !response.body) throw new Error(`원본 사진 응답: ${response.status}`);
  if (!/^(image\/(jpeg|png|webp)|application\/octet-stream)(;|$)/i.test(response.headers.get("content-type") || "")) throw new Error("지원하지 않는 사진 형식이에요.");
  if (Number(response.headers.get("content-length")) > MAX_BYTES) throw new Error("사진이 10MB를 넘어요.");
  const chunks: Uint8Array[] = []; let bytes = 0;
  const reader = response.body.getReader();
  try {
    for (;;) {
      const { done, value } = await reader.read(); if (done) break;
      bytes += value.byteLength;
      if (bytes > MAX_BYTES) throw new Error("사진이 10MB를 넘어요.");
      chunks.push(value);
    }
  } finally { await reader.cancel(); }
  // vinext's optional-dependency stub is unknown; use the installed Sharp types.
  const sharp = (await import("sharp")).default as typeof import("../node_modules/sharp/lib/index");
  const input = Buffer.concat(chunks);
  // 라벨이 잘못된 HEIF 같은 파일이 libvips의 다른 디코더(libheif)에 닿지 않도록 서명을 먼저 확인합니다.
  if (!["image/jpeg", "image/png", "image/webp"].some(type => hasAllowedFileSignature(type, input))) throw new Error("지원하지 않는 사진 형식이에요.");
  const decoded = sharp(input, { limitInputPixels: 40_000_000 });
  if (!["jpeg", "png", "webp"].includes((await decoded.metadata()).format || "")) throw new Error("지원하지 않는 사진 형식이에요.");
  const buffer = await decoded.rotate()
    .resize({ width: 480, height: 480, fit: "inside", withoutEnlargement: true })
    .webp({ quality: 78 }).toBuffer();
  return { buffer, originalBytes: bytes, key: `thumb-v1/${createHash("sha256").update(buffer).digest("hex")}.webp` };
}

export async function processAnimalThumbnails(options: { maxJobs?: number; durationMs?: number; concurrency?: number } = {}) {
  const db = getSupabaseServerClient();
  const id = crypto.randomUUID();
  const startedAt = new Date().toISOString();
  await db.from("sync_runs").insert({ id, kind: "animal-thumbnails", status: "running", started_at: startedAt, updated_at: startedAt }).throwOnError();
  const result = { completed: 0, failed: 0, originalBytes: 0, thumbnailBytes: 0 };
  const errors: string[] = [];
  const finish = async (status: string, message: string) => {
    const now = new Date().toISOString();
    await db.from("sync_runs").update({ status, finished_at: now, updated_at: now,
      processed_count: result.completed + result.failed, image_completed: result.completed, image_failed: result.failed,
      original_bytes: result.originalBytes, thumbnail_bytes: result.thumbnailBytes, message: message.slice(0, 1500),
    }).eq("id", id).throwOnError();
  };
  try {
    await processThumbnailBatch(options, result, errors);
    await finish(result.failed ? "partial" : "completed", errors.join("\n"));
    return result;
  } catch (error) {
    await finish("failed", error instanceof Error ? error.message : "사진 처리 실행 실패");
    throw error;
  }
}

async function processThumbnailBatch(options: { maxJobs?: number; durationMs?: number; concurrency?: number }, result: { completed: number; failed: number; originalBytes: number; thumbnailBytes: number }, errors: string[]) {
  // Fail a broken deployment before claiming or consuming any image retries.
  await import("sharp");
  const db = getSupabaseServerClient();
  // 하루 한 번 도는 크론이 유입량(동물당 사진 2장)을 따라잡도록 한 실행의 처리량을 잡습니다.
  // 240초는 함수 한도 300초에서 사진 다운로드 타임아웃(15초)·변환·업로드 여유를 뺀 값입니다. 동시 12장은 SQL claim 상한(20) 안입니다.
  const deadline = Date.now() + Math.min(options.durationMs ?? 240000, 240000);
  const maxJobs = Math.min(options.maxJobs ?? 5000, 5000);
  while (Date.now() < deadline && result.completed + result.failed < maxJobs) {
    const { data: jobs } = await db.rpc("claim_animal_thumbnails", { p_limit: Math.min(Math.max(1, options.concurrency ?? 12), 12, maxJobs - result.completed - result.failed) }).throwOnError();
    if (!jobs?.length) break;
    await Promise.all(jobs.map(async (job: { id: number; animal_id: string; slot: number; source_url: string; updated_at: string; attempt_count: number }) => {
      try {
        const image = await createAnimalThumbnail(job.source_url);
        const bucket = db.storage.from("animal-images");
        const uploaded = await bucket.upload(image.key, image.buffer, { contentType: "image/webp", cacheControl: "31536000", upsert: false });
        if (uploaded.error && !["409", "400"].includes(String((uploaded.error as { statusCode?: string }).statusCode))) throw uploaded.error;
        if (uploaded.error && !/already exists|duplicate/i.test(uploaded.error.message)) throw uploaded.error;
        const url = bucket.getPublicUrl(image.key).data.publicUrl;
        // A source change during conversion must never attach an old thumbnail.
        await db.from("public_animals").update({ [`image_${job.slot}_storage`]: url })
          .eq("id", job.animal_id).eq(`image_${job.slot}`, job.source_url).throwOnError();
        await db.from("animal_image_jobs").update({ status: "completed", storage_url: url, last_error: "", updated_at: new Date().toISOString() })
          .eq("id", job.id).eq("status", "processing").eq("updated_at", job.updated_at).throwOnError();
        result.completed++; result.originalBytes += image.originalBytes; result.thumbnailBytes += image.buffer.length;
      } catch (error) {
        const message = error instanceof Error ? error.message : "사진을 변환하지 못했어요.";
        if (errors.length < 5) errors.push(`동물 ${job.animal_id} · 사진 ${job.slot}: ${message.slice(0, 200)}`);
        await db.from("animal_image_jobs").update({ status: "failed", last_error: message.slice(0, 300),
          next_attempt_at: new Date(Date.now() + 60000 * 2 ** job.attempt_count).toISOString(), updated_at: new Date().toISOString() })
          .eq("id", job.id).eq("status", "processing").eq("updated_at", job.updated_at).throwOnError();
        result.failed++;
      }
    }));
  }
  return result;
}
