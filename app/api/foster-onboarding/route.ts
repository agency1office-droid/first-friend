import { getChatGPTUser } from "../../chatgpt-auth";
import { getSupabaseServerClient } from "../../../lib/supabase/server";

export async function GET() {
  const user = await getChatGPTUser();
  if (!user) return Response.json({ completed: false }, { status: 401 });
  const { data: member } = await getSupabaseServerClient().from("members").select("foster_education_completed").eq("id", user.userId).maybeSingle();
  return Response.json({ completed: Boolean(member?.foster_education_completed) });
}

export async function POST(request: Request) {
  const user = await getChatGPTUser();
  if (!user) return Response.json({ error: "본인 확인이 필요합니다." }, { status: 401 });
  const data = await request.json() as Record<string, unknown>, answers = Array.isArray(data.answers) ? data.answers : [], correct = [false, false, true, false, true];
  const score = Math.round(correct.reduce((sum, value, index) => sum + (answers[index] === value ? 1 : 0), 0) / correct.length * 100);
  if (score < 80) return Response.json({ error: "기본 교육을 다시 확인해 주세요." }, { status: 400 });
  const { error } = await getSupabaseServerClient().from("members").update({ foster_education_completed: true }).eq("id", user.userId);
  if (error) return Response.json({ error: "교육 이수 상태를 저장하지 못했어요." }, { status: 500 });
  return Response.json({ completed: true, score });
}
