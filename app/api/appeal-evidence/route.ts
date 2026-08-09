import { env } from "cloudflare:workers";
import { getChatGPTUser } from "../../chatgpt-auth";

const allowed = new Set(["image/jpeg", "image/png", "image/webp"]);

// 제재 상태에서도 이의제기권은 보장되어야 하므로 일반 업로드와 인증 경로를 분리합니다.
export async function POST(request: Request) {
  const user = await getChatGPTUser();
  if (!user) return Response.json({ error: "본인 확인이 필요합니다." }, { status: 401 });
  const form = await request.formData();
  const file = form.get("file");
  if (!(file instanceof File) || !allowed.has(file.type) || file.size > 8 * 1024 * 1024) {
    return Response.json({ error: "증빙은 8MB 이하 JPG·PNG·WEBP만 가능해요." }, { status: 400 });
  }
  const extension = file.type === "image/png" ? "png" : file.type === "image/webp" ? "webp" : "jpg";
  const key = `appeal-evidence/${user.userId}/${crypto.randomUUID()}.${extension}`;
  await env.MEDIA.put(key, await file.arrayBuffer(), { httpMetadata: { contentType: file.type }, customMetadata: { ownerId: user.userId, purpose: "sanction-appeal" } });
  return Response.json({ key }, { status: 201 });
}
