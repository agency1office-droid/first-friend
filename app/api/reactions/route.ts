import { getChatGPTUser } from "../../chatgpt-auth";
import { getSupabaseServerClient } from "../../../lib/supabase/server";

export async function POST(request: Request) {
  const user = await getChatGPTUser();
  if (!user) return Response.json({ error: "본인 확인이 필요합니다." }, { status: 401 });
  const data = await request.json() as { postId?: number; reaction?: "cheer" | "heart" };
  const postId = Number(data.postId);
  if (!postId) return Response.json({ error: "이야기 정보가 필요합니다." }, { status: 400 });
  const client = getSupabaseServerClient();
  const { data: existing } = await client.from("post_reactions").select("id").eq("member_id", user.userId).eq("post_id", postId).maybeSingle();
  if (existing) {
    await client.from("post_reactions").delete().eq("id", existing.id);
    return Response.json({ active: false });
  }
  const { error } = await client.from("post_reactions").insert({ member_id: user.userId, post_id: postId, reaction: data.reaction || "cheer" });
  if (error) return Response.json({ error: "반응을 저장하지 못했어요." }, { status: 500 });
  return Response.json({ active: true }, { status: 201 });
}
