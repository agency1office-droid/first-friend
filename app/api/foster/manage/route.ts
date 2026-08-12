import { getChatGPTUser } from "../../../chatgpt-auth";
import { getSupabaseServerClient } from "../../../../lib/supabase/server";
import { clean } from "../../_helpers";

const mapAnimal = (row: Record<string, unknown>) => ({ ...row, memberId: row.member_id, rescueStory: row.rescue_story, healthJson: row.health_json, lifeJson: row.life_json, adoptionTerms: row.adoption_terms, imageKey: row.image_key, createdAt: row.created_at, updatedAt: row.updated_at, reconfirmedAt: row.reconfirmed_at });
const mapApplication = (row: Record<string, unknown>) => ({ ...row, memberId: row.member_id, animalId: row.animal_id, carePlan: row.care_plan, readinessScore: row.readiness_score, createdAt: row.created_at });

async function getOwnedApplication(client: ReturnType<typeof getSupabaseServerClient>, userId: string, id: number) {
  const { data: application } = await client.from("applications").select("*").eq("id", id).maybeSingle();
  if (!application || !String(application.animal_id).startsWith("direct-")) return null;
  const { data: animal } = await client.from("direct_animals").select("id").eq("id", Number(String(application.animal_id).slice(7))).eq("member_id", userId).maybeSingle();
  return animal ? application : null;
}

export async function GET() {
  const user = await getChatGPTUser();
  if (!user) return Response.json({ error: "로그인이 필요합니다." }, { status: 401 });
  const client = getSupabaseServerClient(), { data: animals } = await client.from("direct_animals").select("*").eq("member_id", user.userId).order("created_at", { ascending: false });
  const ids = (animals || []).map(row => `direct-${row.id}`);
  const { data: applications } = ids.length ? await client.from("applications").select("*").in("animal_id", ids).order("readiness_score", { ascending: false }) : { data: [] };
  return Response.json({ animals: (animals || []).map(mapAnimal), applications: (applications || []).map(mapApplication) });
}

export async function POST(request: Request) {
  const user = await getChatGPTUser();
  if (!user) return Response.json({ error: "로그인이 필요합니다." }, { status: 401 });
  const client = getSupabaseServerClient(), data = await request.json() as Record<string, unknown>, action = clean(data.action, 30) || "animal-status", id = Number(data.id);
  if (action === "application-status") {
    const application = await getOwnedApplication(client, user.userId, id), status = clean(data.status, 20);
    if (!application || !["consulting", "approved", "rejected"].includes(status)) return Response.json({ error: "담당 신청과 상태를 확인해 주세요." }, { status: 403 });
    const { data: row } = await client.from("applications").update({ status }).eq("id", id).select("*").single();
    await client.from("application_events").insert({ application_id: id, actor_id: user.userId, event_type: `status:${status}`, note: "개인 임시보호자 검토" });
    await client.from("notifications").insert({ member_id: application.member_id, type: "application_status", title: "입양 신청 상태가 변경됐어요", body: `신청 #${id}: ${status}`, href: `/applications/${id}` });
    return Response.json({ row: row ? mapApplication(row) : null });
  }
  if (action === "message") {
    const application = await getOwnedApplication(client, user.userId, id), body = clean(data.body, 1000);
    if (!application || body.length < 2) return Response.json({ error: "담당 신청과 메시지를 확인해 주세요." }, { status: 403 });
    const { data: message } = await client.from("application_messages").insert({ application_id: id, sender_id: user.userId, body }).select("*").single();
    await client.from("notifications").insert({ member_id: application.member_id, type: "application_message", title: "임시보호자의 상담 메시지", body: body.slice(0, 100), href: `/applications/${id}` });
    return Response.json({ message });
  }
  const status = clean(data.status, 20);
  if (!["draft", "review", "published", "closed"].includes(status)) return Response.json({ error: "상태를 확인해 주세요." }, { status: 400 });
  const update: Record<string, unknown> = { status, updated_at: new Date().toISOString() };
  if (action === "reconfirm") update.reconfirmed_at = new Date().toISOString();
  const { data: row } = await client.from("direct_animals").update(update).eq("id", id).eq("member_id", user.userId).select("*").maybeSingle();
  if (!row) return Response.json({ error: "관리 권한이 없습니다." }, { status: 403 });
  return Response.json({ row: mapAnimal(row) });
}
