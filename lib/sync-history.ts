import { getSupabaseServerClient } from "./supabase/server";

export async function getSyncHistory(params: URLSearchParams) {
  const kind = params.get("kind") || "";
  const status = params.get("status") || "";
  const page = Number(params.get("page") || 1);
  if ((kind && !["public-animals", "public-lost-animals", "animal-thumbnails"].includes(kind)) ||
      (status && !["running", "completed", "partial", "failed", "paused"].includes(status)) ||
      !Number.isSafeInteger(page) || page < 1 || page > 10000) throw new Error("동기화 검색 조건을 확인해 주세요.");
  const db = getSupabaseServerClient();
  let query = db.from("sync_runs").select("*", { count: "exact" });
  if (kind) query = query.eq("kind", kind);
  if (status) query = query.eq("status", status);
  const [runs, states, images, completed] = await Promise.all([
    query.order("started_at", { ascending: false }).order("id", { ascending: false }).range((page - 1) * 20, page * 20 - 1).throwOnError(),
    db.from("public_sync_state").select("id,status,last_started_at,last_completed_at,item_count,page_count").in("id", ["public-animals", "public-lost-animals"]).throwOnError(),
    db.rpc("animal_image_job_summary").throwOnError(),
    db.from("sync_runs").select("finished_at").eq("kind", "animal-thumbnails").in("status", ["completed", "partial"]).order("finished_at", { ascending: false }).limit(1).throwOnError(),
  ]);
  return { runs: runs.data || [], total: runs.count || 0, page, states: states.data || [], images: images.data || [], lastImageRun: completed.data?.[0]?.finished_at || null };
}
