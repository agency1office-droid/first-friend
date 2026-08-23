import { getChatGPTUser } from "../../chatgpt-auth";
import { hasAllowedFileSignature, PRIVATE_EVIDENCE_BUCKET, uploadStoredFile } from "../../../lib/supabase/storage";

const allowed = new Set(["image/jpeg", "image/png", "image/webp"]);
const purpose = "sanction-appeal";

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
  const key = `${purpose}/${user.userId}/${crypto.randomUUID()}.${extension}`;
  try {
    const content = await file.arrayBuffer();
    if (!hasAllowedFileSignature(file.type, new Uint8Array(content))) return Response.json({ error: "파일 형식을 확인할 수 없어요." }, { status: 400 });
    await uploadStoredFile(PRIVATE_EVIDENCE_BUCKET, key, content, file.type);
  } catch {
    return Response.json({ error: "증빙 파일을 저장하지 못했어요. 잠시 후 다시 시도해 주세요." }, { status: 503 });
  }
  return Response.json({ key }, { status: 201 });
}
