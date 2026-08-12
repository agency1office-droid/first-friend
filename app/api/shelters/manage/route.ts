import { getChatGPTUser } from "../../../chatgpt-auth";
import { getSupabaseServerClient } from "../../../../lib/supabase/server";
import { clean } from "../../_helpers";

const map = (row: Record<string, unknown>) => ({ ...row, ownerId: row.owner_id, publicId: row.public_id, shelterId: row.shelter_id, authorId: row.author_id, createdAt: row.created_at, scheduledAt: row.scheduled_at, targetQuantity: row.target_quantity, receivedQuantity: row.received_quantity, unitPrice: row.unit_price, postId: row.post_id, memberId: row.member_id });
async function owner() {
  const user = await getChatGPTUser(); if (!user) return null;
  const client = getSupabaseServerClient(), { data: member } = await client.from("members").select("role,verified").eq("id", user.userId).maybeSingle();
  if (!member || !((member.role === "shelter" && member.verified) || member.role === "admin")) return { user, member, profile: null, forbidden: true as const, client };
  const { data: profile } = await client.from("shelter_profiles").select("*").eq("owner_id", user.userId).maybeSingle();
  return { user, member, profile, forbidden: false as const, client };
}

export async function GET() {
  const state = await owner(); if (!state) return Response.json({ error: "로그인이 필요합니다." }, { status: 401 });
  if (state.forbidden) return Response.json({ error: "보호소 인증 승인 후 이용할 수 있습니다." }, { status: 403 });
  if (!state.profile) return Response.json({ profile: null, updates: [], volunteers: [], needs: [], applications: [] });
  const id = state.profile.id, client = state.client;
  const [{ data: updates }, { data: volunteers }, { data: needs }, { data: adoptionApplications }] = await Promise.all([client.from("shelter_updates").select("*").eq("shelter_id", id).order("created_at", { ascending: false }), client.from("volunteer_posts").select("*").eq("shelter_id", id).order("created_at", { ascending: false }), client.from("shelter_needs").select("*").eq("shelter_id", id), client.from("applications").select("*").eq("guardian_id", state.user.userId).order("created_at", { ascending: false })]);
  const posts = volunteers || [], { data: applications } = posts.length ? await client.from("volunteer_applications").select("*").in("post_id", posts.map(post => post.id)) : { data: [] };
  return Response.json({ profile: map(state.profile), updates: (updates || []).map(map), volunteers: posts.map(map), needs: (needs || []).map(map), applications: (applications || []).map(map), adoptionApplications: (adoptionApplications || []).map(map) });
}

export async function POST(request: Request) {
  const state = await owner(); if (!state) return Response.json({ error: "로그인이 필요합니다." }, { status: 401 });
  if (state.forbidden) return Response.json({ error: "보호소 인증 승인 후 이용할 수 있습니다." }, { status: 403 });
  const data = await request.json() as Record<string, unknown>, action = clean(data.action, 30), client = state.client;
  if (action === "profile") {
    const name = clean(data.name, 120), region = clean(data.region, 80), introduction = clean(data.introduction, 1000), publicId = clean(data.publicId, 120) || `direct-shelter-${state.user.userId}`;
    if (!name || !region || introduction.length < 20) return Response.json({ error: "이름·지역·소개를 확인해 주세요." }, { status: 400 });
    const { data: existing } = await client.from("shelter_profiles").select("*").eq("public_id", publicId).maybeSingle();
    if (existing?.owner_id && existing.owner_id !== state.user.userId) return Response.json({ error: "이미 관리자가 연결된 보호소입니다." }, { status: 409 });
    const { error } = existing ? await client.from("shelter_profiles").update({ owner_id: state.user.userId, name, region, introduction, verified: true }).eq("id", existing.id) : await client.from("shelter_profiles").insert({ owner_id: state.user.userId, public_id: publicId, name, region, introduction, verified: true });
    if (error) return Response.json({ error: "보호소 프로필을 저장하지 못했어요." }, { status: 500 });
    await client.from("applications").update({ guardian_id: state.user.userId }).eq("shelter_public_id", publicId).is("guardian_id", null);
    return Response.json({ ok: true }, { status: existing ? 200 : 201 });
  }
  if (!state.profile) return Response.json({ error: "보호소 프로필을 먼저 저장해 주세요." }, { status: 400 });
  if (action === "update") {
    const title = clean(data.title, 120), body = clean(data.body, 2000), category = clean(data.category, 20);
    if (!title || body.length < 20) return Response.json({ error: "제목과 20자 이상의 소식을 적어주세요." }, { status: 400 });
    const { data: row, error } = await client.from("shelter_updates").insert({ shelter_id: state.profile.id, author_id: state.user.userId, title, body, category: ["daily", "urgent", "result", "notice"].includes(category) ? category : "daily" }).select("*").single();
    if (error) return Response.json({ error: "보호소 소식을 저장하지 못했어요." }, { status: 500 });
    const { data: followers } = await client.from("shelter_follows").select("member_id").eq("shelter_public_id", state.profile.public_id);
    if (followers?.length) await client.from("notifications").insert(followers.map(follower => ({ member_id: follower.member_id, type: "shelter_update", title: `${state.profile?.name} 새 소식`, body: title, href: `/shelters/${encodeURIComponent(String(state.profile?.public_id))}#shelter-updates` })));
    return Response.json({ row: map(row) }, { status: 201 });
  }
  if (action === "volunteer") {
    const title = clean(data.title, 120), description = clean(data.description, 1000), scheduledAt = clean(data.scheduledAt, 80), capacity = Math.max(1, Math.min(100, Number(data.capacity) || 1)), category = clean(data.category, 20);
    if (!title || description.length < 20 || !scheduledAt) return Response.json({ error: "봉사 내용과 일정을 확인해 주세요." }, { status: 400 });
    const { data: row, error } = await client.from("volunteer_posts").insert({ shelter_id: state.profile.id, title, description, category: ["cleaning", "photography", "transport", "medical", "care", "event"].includes(category) ? category : "care", region: state.profile.region, scheduled_at: scheduledAt, capacity }).select("*").single();
    if (error) return Response.json({ error: "봉사 공고를 저장하지 못했어요." }, { status: 500 });
    return Response.json({ row: map(row) }, { status: 201 });
  }
  if (action === "need") {
    const itemName = clean(data.itemName, 120), targetQuantity = Math.max(1, Math.min(10000, Number(data.targetQuantity) || 1)), unitPrice = Math.max(0, Number(data.unitPrice) || 0);
    if (!itemName) return Response.json({ error: "필요 물품을 적어주세요." }, { status: 400 });
    const { data: row, error } = await client.from("shelter_needs").insert({ shelter_id: state.profile.id, item_name: itemName, target_quantity: targetQuantity, unit_price: unitPrice }).select("*").single();
    if (error) return Response.json({ error: "필요 물품을 저장하지 못했어요." }, { status: 500 });
    return Response.json({ row: map(row) }, { status: 201 });
  }
  if (action === "volunteer-application-status") {
    const id = Number(data.id), status = clean(data.status, 20); const { data: application } = await client.from("volunteer_applications").select("*").eq("id", id).maybeSingle(); const { data: post } = application ? await client.from("volunteer_posts").select("*").eq("id", application.post_id).maybeSingle() : { data: null };
    if (!application || !post || post.shelter_id !== state.profile.id || !["accepted", "declined", "completed"].includes(status)) return Response.json({ error: "봉사 지원과 상태를 확인해 주세요." }, { status: 403 });
    const { data: row } = await client.from("volunteer_applications").update({ status }).eq("id", id).select("*").single();
    if (status === "completed") { const labels: Record<string, string> = { cleaning: "깨끗한 하루", photography: "프로필 사진가", transport: "안전 이동", medical: "의료 도움", care: "돌봄 메이트", event: "현장 지원" }; await client.from("volunteer_badges").upsert([{ member_id: application.member_id, kind: "first", label: "첫 봉사" }, { member_id: application.member_id, kind: post.category === "event" ? "care" : post.category, label: labels[post.category] || "돌봄 메이트" }], { onConflict: "member_id,kind", ignoreDuplicates: true }); }
    return Response.json({ row: row ? map(row) : null });
  }
  if (action === "need-received") {
    const id = Number(data.id), { data: need } = await client.from("shelter_needs").select("*").eq("id", id).maybeSingle();
    if (!need || need.shelter_id !== state.profile.id) return Response.json({ error: "필요 물품 관리 권한이 없습니다." }, { status: 403 });
    const received = Math.max(0, Math.min(need.target_quantity, Number(data.receivedQuantity) || 0)), status = received >= need.target_quantity ? "fulfilled" : "needed";
    const { data: row } = await client.from("shelter_needs").update({ received_quantity: received, status }).eq("id", id).select("*").single();
    if (status === "fulfilled") await client.from("support_records").update({ status: "confirmed" }).eq("kind", "shelter_item").eq("target_id", String(id));
    return Response.json({ row: row ? map(row) : null });
  }
  return Response.json({ error: "지원하지 않는 요청입니다." }, { status: 400 });
}
