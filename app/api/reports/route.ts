import { getChatGPTUser } from "../../chatgpt-auth";
import { getSupabaseServerClient } from "../../../lib/supabase/server";
import { clean } from "../_helpers";

export async function POST(request: Request) {
  const user = await getChatGPTUser();
  if (!user) return Response.json({ error: "본인 확인이 필요합니다." }, { status: 401 });
  const data = await request.json() as Record<string, unknown>;
  const targetType = clean(data.targetType, 30), targetId = clean(data.targetId, 40), reason = clean(data.reason, 500);
  if (!targetType || !targetId || reason.length < 5) return Response.json({ error: "신고 사유를 확인해 주세요." }, { status: 400 });
  const severity = /학대|폭행|살해|긴급|사망|유기/.test(reason) ? "critical" : /사기|금전|개인정보|주소|전화/.test(reason) ? "high" : "normal";
  const client = getSupabaseServerClient();
  await client.from("reports").upsert({ member_id: user.userId, target_type: targetType, target_id: targetId, reason, severity }, { onConflict: "member_id,target_type,target_id", ignoreDuplicates: true });
  const { count } = await client.from("reports").select("id", { count: "exact", head: true }).eq("target_type", targetType).eq("target_id", targetId);
  const reportCount = count || 0, hidden = targetType === "post" && reportCount >= 50;
  if (hidden) await client.from("posts").update({ hidden: true }).eq("id", Number(targetId));
  return Response.json({ received: true, hidden, severity, reportCount, reviewPriority: severity === "critical" ? "immediate" : severity === "high" ? "priority" : "standard" }, { status: 201 });
}
