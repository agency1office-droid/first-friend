import { processAnimalThumbnails } from "../../../../lib/animal-thumbnails";

export const maxDuration = 300;
export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET?.trim();
  if (!secret || request.headers.get("authorization") !== `Bearer ${secret}`) return Response.json({ error: "동기화 권한이 없습니다." }, { status: 403 });
  try {
    return Response.json({ ok: true, ...await processAnimalThumbnails() }, { headers: { "cache-control": "no-store" } });
  } catch {
    return Response.json({ ok: false, error: "사진 작업을 완료하지 못했어요. 다음 실행에서 다시 확인해요." }, { status: 503 });
  }
}
export const POST = GET;
