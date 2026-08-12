import { authenticatedDb } from "../_helpers";
import { uploadStoredFile } from "../../../lib/supabase/storage";

const allowed = new Set(["image/jpeg", "image/png", "image/webp", "video/mp4", "video/webm"]);

export async function POST(request: Request) {
  const auth = await authenticatedDb();
  if (!auth) return Response.json({ error: "본인 확인이 필요합니다." }, { status: 401 });
  const form = await request.formData();
  const file = form.get("file");
  const purpose = String(form.get("purpose") || "public-media");
  const max = file instanceof File && file.type.startsWith("video/") ? 30 * 1024 * 1024 : 8 * 1024 * 1024;
  if (!(file instanceof File) || !allowed.has(file.type) || file.size > max) return Response.json({ error: "사진은 8MB 이하 JPG·PNG·WEBP, 영상은 30MB 이하 MP4·WEBM만 가능해요." }, { status: 400 });
  const extension = file.type === "image/png" ? "png" : file.type === "image/webp" ? "webp" : file.type === "video/mp4" ? "mp4" : file.type === "video/webm" ? "webm" : "jpg";
  const privateEvidence = ["role-verification", "adoption-verification"].includes(purpose);
  const key = `${privateEvidence ? "private-evidence" : "uploads"}/${auth.user.userId}/${crypto.randomUUID()}.${extension}`;
  await uploadStoredFile(key, await file.arrayBuffer(), file.type);
  return Response.json({ key }, { status: 201 });
}
