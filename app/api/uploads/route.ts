import { getChatGPTUser } from "../../chatgpt-auth";
import { hasAllowedFileSignature, PRIVATE_EVIDENCE_BUCKET, PUBLIC_MEDIA_BUCKET, uploadStoredFile } from "../../../lib/supabase/storage";
import { beginIdempotentRequest, completeIdempotentRequest, enforceRateLimit, releaseIdempotentRequest, requestSubject } from "../../../lib/api-guards";

const allowed = new Set(["image/jpeg", "image/png", "image/webp", "video/mp4", "video/webm"]);

export async function POST(request: Request) {
  const user = await getChatGPTUser();
  if (!user) return Response.json({ error: "본인 확인이 필요합니다." }, { status: 401 });
  if (!await enforceRateLimit("uploads", requestSubject(request, user.userId), 3600, 30)) return Response.json({ error: "업로드가 너무 많아요. 잠시 후 다시 시도해 주세요." }, { status: 429, headers: { "retry-after": "3600" } });
  const form = await request.formData();
  const file = form.get("file");
  const purpose = String(form.get("purpose") || "public-media");
  const max = file instanceof File && file.type.startsWith("video/") ? 30 * 1024 * 1024 : 8 * 1024 * 1024;
  if (!(file instanceof File) || !allowed.has(file.type) || file.size > max) return Response.json({ error: "사진은 8MB 이하 JPG·PNG·WEBP, 영상은 30MB 이하 MP4·WEBM만 가능해요." }, { status: 400 });
  const extension = file.type === "image/png" ? "png" : file.type === "image/webp" ? "webp" : file.type === "video/mp4" ? "mp4" : file.type === "video/webm" ? "webm" : "jpg";
  const privateEvidence = ["role-verification", "adoption-verification"].includes(purpose);
  const content = await file.arrayBuffer();
  if (!hasAllowedFileSignature(file.type, new Uint8Array(content))) return Response.json({ error: "파일 형식을 확인할 수 없어요." }, { status: 400 });
  const bucket = privateEvidence ? PRIVATE_EVIDENCE_BUCKET : PUBLIC_MEDIA_BUCKET;
  const key = `${privateEvidence ? "private-evidence" : "public-media"}/${user.userId}/${crypto.randomUUID()}.${extension}`;
  const guard = await beginIdempotentRequest("uploads", requestSubject(request, user.userId), request, `${file.type}:${file.size}:${Array.from(new Uint8Array(content)).slice(0, 64).join(",")}`);
  if (guard.kind === "replay" || guard.kind === "conflict") return guard.response;
  try {
    await uploadStoredFile(bucket, key, content, file.type);
    const body = { key };
    if (guard.kind === "started") await completeIdempotentRequest(guard, body, 201);
    return Response.json(body, { status: 201 });
  } catch {
    if (guard.kind === "started") await releaseIdempotentRequest(guard);
    return Response.json({ error: "파일을 저장하지 못했어요. 잠시 후 다시 시도해 주세요." }, { status: 503 });
  }
}
