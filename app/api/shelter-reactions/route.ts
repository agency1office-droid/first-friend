import { getChatGPTUser } from "../../chatgpt-auth";
import { getSupabaseServerClient } from "../../../lib/supabase/server";

export async function POST(request: Request) {
  const user = await getChatGPTUser();
  if (!user) return Response.json({ error: "본인 확인이 필요합니다." }, { status: 401 });
  const updateId = Number((await request.json() as { updateId?: number }).updateId);
  if (!updateId) return Response.json({ error: "소식 정보가 필요합니다." }, { status: 400 });
  const client = getSupabaseServerClient();
  const { data: update } = await client.from("shelter_updates").select("id,hidden,reactions").eq("id", updateId).maybeSingle();
  if (!update || update.hidden) return Response.json({ error: "소식을 찾을 수 없습니다." }, { status: 404 });
  const { data: existing } = await client.from("shelter_update_reactions").select("id").eq("update_id", updateId).eq("member_id", user.userId).maybeSingle();
  const current = Number(update.reactions || 0);
  if (existing) {
    await client.from("shelter_update_reactions").delete().eq("id", existing.id);
    const count = Math.max(0, current - 1);
    await client.from("shelter_updates").update({ reactions: count }).eq("id", updateId);
    return Response.json({ active: false, count });
  }
  await client.from("shelter_update_reactions").insert({ update_id: updateId, member_id: user.userId });
  const count = current + 1;
  await client.from("shelter_updates").update({ reactions: count }).eq("id", updateId);
  return Response.json({ active: true, count }, { status: 201 });
}
