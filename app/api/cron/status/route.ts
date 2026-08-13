import { getSupabaseServerClient } from "../../../../lib/supabase/server";

export const dynamic = "force-dynamic";

function authorized(request: Request) {
  const expected = process.env.CRON_SECRET?.trim();
  const supplied = request.headers.get("x-sync-token")?.trim() || request.headers.get("authorization")?.replace(/^Bearer\s+/i, "").trim();
  return Boolean(expected && supplied && supplied === expected);
}

/** 외부 모니터링이 동기화 실패를 감지할 수 있는 읽기 전용 상태 엔드포인트입니다. */
export async function GET(request: Request) {
  if (!authorized(request)) return Response.json({ error: "동기화 권한이 없습니다." }, { status: 403 });
  const { data, error } = await getSupabaseServerClient()
    .from("public_sync_state")
    .select("id,status,item_count,page_count,last_started_at,last_completed_at,message")
    .in("id", ["public-animals", "public-lost-animals", "animal-images"])
    .order("id");
  if (error) {
    console.error("[sync-status]", error.message);
    return Response.json({ ok: false, error: "동기화 상태를 조회하지 못했어요." }, { status: 503, headers: { "cache-control": "no-store" } });
  }
  return Response.json({ ok: true, jobs: data || [], checkedAt: new Date().toISOString() }, { headers: { "cache-control": "no-store" } });
}
