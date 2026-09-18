import { getChatGPTUser } from "../../../chatgpt-auth";
import { getSupabaseServerClient } from "../../../../lib/supabase/server";
import { refreshSavedSearchMatches } from "../../../../lib/saved-search-alerts";

export async function GET() {
  const user = await getChatGPTUser();
  if (!user) return Response.json({ unread: 0 }, { status: 401 });
  const client = getSupabaseServerClient();
  // 벨 배지도 저장 검색 매칭을 반영한다. 같은 회원은 30분에 한 번만 다시 찾는다.
  await refreshSavedSearchMatches(client, user.userId).catch(() => undefined);
  const { count } = await client.from("notifications").select("id", { count: "exact", head: true }).eq("member_id", user.userId).eq("read", false);
  return Response.json({ unread: count || 0 });
}
