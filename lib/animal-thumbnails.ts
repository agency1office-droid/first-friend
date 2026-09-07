import { createHash } from "node:crypto";
import { getSupabaseServerClient } from "./supabase/server";

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
  const decoded = sharp(input, { limitInputPixels: 40_000_000 });
  if (!["jpeg", "png", "webp"].includes((await decoded.metadata()).format || "")) throw new Error("지원하지 않는 사진 형식이에요.");
  const buffer = await decoded.rotate()
    .resize({ width: 480, height: 480, fit: "inside", withoutEnlargement: true })
    .webp({ quality: 78 }).toBuffer();
  return { buffer, originalBytes: bytes, key: `thumb-v1/${createHash("sha256").update(buffer).digest("hex")}.webp` };
}

export async function processAnimalThumbnails(options: { maxJobs?: number; durationMs?: number; concurrency?: number } = {}) {
  // Fail a broken deployment before claiming or consuming any image retries.
  await import("sharp");
  const db = getSupabaseServerClient();
  const deadline = Date.now() + Math.min(options.durationMs ?? 200000, 200000);
  const maxJobs = Math.min(options.maxJobs ?? 5000, 5000);
  const result = { completed: 0, failed: 0, originalBytes: 0, thumbnailBytes: 0 };
  while (Date.now() < deadline && result.completed + result.failed < maxJobs) {
    const { data: jobs } = await db.rpc("claim_animal_thumbnails", { p_limit: Math.min(Math.max(1, options.concurrency ?? 8), 8, maxJobs - result.completed - result.failed) }).throwOnError();
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
        await db.from("animal_image_jobs").update({ status: "failed", last_error: message.slice(0, 300),
          next_attempt_at: new Date(Date.now() + 60000 * 2 ** job.attempt_count).toISOString(), updated_at: new Date().toISOString() })
          .eq("id", job.id).eq("status", "processing").eq("updated_at", job.updated_at).throwOnError();
        result.failed++;
      }
    }));
  }
  return result;
}
