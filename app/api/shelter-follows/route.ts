import { getChatGPTUser } from "../../chatgpt-auth";
import { getSupabaseServerClient } from "../../../lib/supabase/server";
import { clean } from "../_helpers";

export async function GET(request: Request) {
  const user = await getChatGPTUser();
  if (!user) return Response.json({ following: false }, { status: 401 });
  const shelterId = clean(new URL(request.url).searchParams.get("shelterId"), 120);
  if (!shelterId) return Response.json({ following: false });
  const { data } = await getSupabaseServerClient().from("shelter_follows").select("id").eq("shelter_public_id", shelterId).eq("member_id", user.userId).maybeSingle();
  return Response.json({ following: Boolean(data) });
}

export async function POST(request: Request) {
  const user = await getChatGPTUser();
  if (!user) return Response.json({ error: "로그인이 필요합니다." }, { status: 401 });
  const shelterId = clean((await request.json() as { shelterId?: string }).shelterId, 120);
  if (!shelterId) return Response.json({ error: "보호소 정보를 확인해 주세요." }, { status: 400 });
  const client = getSupabaseServerClient();
  const { data: existing } = await client.from("shelter_follows").select("id").eq("shelter_public_id", shelterId).eq("member_id", user.userId).maybeSingle();
  if (existing) {
    await client.from("shelter_follows").delete().eq("id", existing.id);
    return Response.json({ following: false });
  }
  const { error } = await client.from("shelter_follows").insert({ shelter_public_id: shelterId, member_id: user.userId });
  if (error) return Response.json({ error: "보호소 팔로우를 저장하지 못했어요." }, { status: 500 });
  return Response.json({ following: true }, { status: 201 });
}
