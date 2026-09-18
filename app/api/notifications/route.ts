import { getChatGPTUser } from "../../chatgpt-auth";
import { getSupabaseServerClient } from "../../../lib/supabase/server";
import { refreshSavedSearchMatches } from "../../../lib/saved-search-alerts";

export async function GET() {
  const user = await getChatGPTUser();
  if (!user) return Response.json({ error: "본인 확인이 필요합니다." }, { status: 401 });
  const client = getSupabaseServerClient();
  await refreshSavedSearchMatches(client, user.userId, { force: true });
  const { data: rows } = await client.from("notifications").select("id,title,body,href,read,created_at").eq("member_id", user.userId).order("created_at", { ascending: false }).limit(50);
  return Response.json({ notifications: (rows || []).map(row => ({ ...row, createdAt: row.created_at })) });
}

export async function POST() {
  const user = await getChatGPTUser();
  if (!user) return Response.json({ error: "본인 확인이 필요합니다." }, { status: 401 });
  await getSupabaseServerClient().from("notifications").update({ read: true }).eq("member_id", user.userId);
  return Response.json({ ok: true });
}
