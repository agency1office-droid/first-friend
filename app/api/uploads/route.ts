import { env } from "cloudflare:workers";
import { authenticatedDb } from "../_helpers";

const allowed = new Set(["image/jpeg", "image/png", "image/webp"]);

export async function POST(request: Request) {
  const auth = await authenticatedDb();
  if (!auth) return Response.json({ error: "본인 확인이 필요합니다." }, { status: 401 });
  const form = await request.formData();
  const file = form.get("file");
  if (!(file instanceof File) || !allowed.has(file.type) || file.size > 8 * 1024 * 1024) return Response.json({ error: "8MB 이하 JPG, PNG, WEBP 파일만 올릴 수 있어요." }, { status: 400 });
  const extension = file.type === "image/png" ? "png" : file.type === "image/webp" ? "webp" : "jpg";
  const key = `uploads/${auth.user.userId}/${crypto.randomUUID()}.${extension}`;
  await env.MEDIA.put(key, await file.arrayBuffer(), { httpMetadata: { contentType: file.type }, customMetadata: { ownerId: auth.user.userId } });
  return Response.json({ key }, { status: 201 });
}
