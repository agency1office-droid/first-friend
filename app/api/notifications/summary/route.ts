import { getChatGPTUser } from "../../../chatgpt-auth";
import { getSupabaseServerClient } from "../../../../lib/supabase/server";

export async function GET() {
  const user = await getChatGPTUser();
  if (!user) return Response.json({ unread: 0 }, { status: 401 });
  const { count } = await getSupabaseServerClient().from("notifications").select("id", { count: "exact", head: true }).eq("member_id", user.userId).eq("read", false);
  return Response.json({ unread: count || 0 });
}
