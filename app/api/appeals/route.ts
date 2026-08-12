import { getChatGPTUser } from "../../chatgpt-auth";
import { getSupabaseServerClient } from "../../../lib/supabase/server";
import { clean } from "../_helpers";

export async function GET() {
  const user = await getChatGPTUser();
  if (!user) return Response.json({ error: "본인 확인이 필요합니다." }, { status: 401 });
  const { data: appeals } = await getSupabaseServerClient().from("sanction_appeals").select("*").eq("member_id", user.userId).order("created_at", { ascending: false });
  return Response.json({ appeals: appeals || [] });
}

export async function POST(request: Request) {
  const user = await getChatGPTUser();
  if (!user) return Response.json({ error: "본인 확인이 필요합니다." }, { status: 401 });
  const client = getSupabaseServerClient();
  const { data: member } = await client.from("members").select("id").eq("id", user.userId).maybeSingle();
  if (!member) return Response.json({ error: "제재 계정 기록을 찾을 수 없습니다." }, { status: 404 });
  const { data: sanctions } = await client.from("account_sanctions").select("*").eq("member_id", user.userId).eq("status", "confirmed").order("created_at", { ascending: false }).limit(1);
  const sanction = sanctions?.[0];
  if (!sanction) return Response.json({ error: "현재 확정된 제재가 없습니다." }, { status: 400 });
  const data = await request.json() as Record<string, unknown>, reason = clean(data.reason, 2000), evidenceKey = clean(data.evidenceKey, 240);
  if (reason.length < 30) return Response.json({ error: "사실관계와 요청 내용을 30자 이상 적어주세요." }, { status: 400 });
  const { data: existing } = await client.from("sanction_appeals").select("id").eq("sanction_id", sanction.id).eq("status", "submitted").maybeSingle();
  if (existing) return Response.json({ error: "이미 검토 중인 이의제기가 있습니다." }, { status: 409 });
  const { data: appeal, error } = await client.from("sanction_appeals").insert({ sanction_id: sanction.id, member_id: user.userId, reason, evidence_key: evidenceKey || null }).select("*").single();
  if (error) return Response.json({ error: "이의제기를 저장하지 못했어요." }, { status: 500 });
  await client.from("account_sanctions").update({ status: "appealed" }).eq("id", sanction.id);
  return Response.json({ appeal }, { status: 201 });
}
