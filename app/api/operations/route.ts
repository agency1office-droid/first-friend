import { getChatGPTUser } from "../../chatgpt-auth";
import { getSupabaseServerClient } from "../../../lib/supabase/server";
import { sendExternalNotification, sendToOfficialShelter } from "../../../lib/integrations";
import { clean } from "../_helpers";
import { beginIdempotentRequest, completeIdempotentRequest } from "../../../lib/api-guards";
import { canUseOperations, operationResources, parseOperationQuery, resourceAllowed } from "../../../lib/operations";
import { logError } from "../../../lib/observability";

type Row = Record<string, unknown>;
const map = (row: Row) => ({ ...row, memberId: row.member_id, animalId: row.animal_id, guardianId: row.guardian_id, shelterPublicId: row.shelter_public_id, createdAt: row.created_at, updatedAt: row.updated_at });


async function context() {
  const user = await getChatGPTUser(); if (!user) return null;
  const client = getSupabaseServerClient(), { data: member } = await client.from("members").select("*").eq("id", user.userId).maybeSingle().throwOnError();
  return member ? { user, member, client } : null;
}
async function audit(client: ReturnType<typeof getSupabaseServerClient>, actorId: string, action: string, targetType: string, targetId: string, before?: unknown, after?: unknown) {
  await client.from("admin_audit_logs").insert({ actor_id: actorId, action, target_type: targetType, target_id: targetId, before_json: JSON.stringify(before || {}), after_json: JSON.stringify(after || {}) }).throwOnError();
}

export async function GET(request: Request) {
  try {
    const auth = await context();
    if (!auth) return Response.json({ error: "로그인이 필요해요." }, { status: 401 });
    if (!canUseOperations(auth.member.role, auth.member.verified, auth.member.sanctioned)) return Response.json({ error: "인증된 보호소 또는 운영자만 이용할 수 있어요." }, { status: 403 });
    let input;
    try { input = parseOperationQuery(new URL(request.url).searchParams); }
    catch (error) { return Response.json({ error: (error as Error).message }, { status: 400 }); }
    const { resource, page, status, q, sort, pageSize } = input;
    if (!resourceAllowed(resource, auth.member.role)) return Response.json({ error: "운영자만 확인할 수 있는 업무예요." }, { status: 403 });
    const config = operationResources[resource], admin = auth.member.role === "admin", c = auth.client;
    // Apply ownership in SQL before pagination, including return requests.
    let query = c.from(config.table).select(config.fields + (!admin && resource === "returns" ? ",applications!inner(guardian_id)" : ""), { count: "exact" });
    if (!admin) {
      if (resource === "applications") query = query.eq("guardian_id", auth.user.userId);
      if (resource === "registrations") query = query.eq("member_id", auth.user.userId);
      if (resource === "returns") query = query.eq("applications.guardian_id", auth.user.userId);
    }
    if (status) query = query.eq("status", status);
    if (q) {
      // Exact number search; otherwise literal text search, with LIKE wildcards escaped.
      if (/^#[0-9]+$/.test(q)) query = query.eq("id", q.slice(1));
      else query = query.ilike(config.search, "%" + q.replace(/[\\%_]/g, "\\$&") + "%");
    }
    const { data, error, count } = await query.order("created_at", { ascending: sort === "oldest" }).order("id", { ascending: sort === "oldest" }).range((page - 1) * pageSize, page * pageSize - 1);
    if (error) throw error;
    return Response.json({ rows: data || [], total: count || 0, page, pageSize, role: auth.member.role }, { headers: { "cache-control": "no-store" } });
  } catch (error) {
    logError("operations.list_failed", error);
    return Response.json({ error: "목록을 불러오지 못했어요. 잠시 후 다시 확인해 주세요." }, { status: 503 });
  }
}

export async function POST(request: Request) {
  const origin = request.headers.get("origin");
  if (origin && origin !== new URL(request.url).origin) return Response.json({ error: "요청한 주소를 확인해 주세요." }, { status: 403 });
  let guard: Awaited<ReturnType<typeof beginIdempotentRequest>> | undefined;
  try {
    const auth = await context();
    if (!auth) return Response.json({ error: "로그인이 필요해요." }, { status: 401 });
    if (!canUseOperations(auth.member.role, auth.member.verified, auth.member.sanctioned)) return Response.json({ error: "운영 권한이 필요해요." }, { status: 403 });
    let data: Record<string, unknown>;
    try { data = await request.clone().json(); } catch { return Response.json({ error: "요청 내용을 확인해 주세요." }, { status: 400 }); }
    if (!data || typeof data !== "object" || !Number.isSafeInteger(Number(data.id)) || Number(data.id) < 1) return Response.json({ error: "처리할 번호를 확인해 주세요." }, { status: 400 });
    guard = await beginIdempotentRequest("operations", auth.user.userId, request, JSON.stringify(data));
    if (guard.kind === "replay" || guard.kind === "conflict") return guard.response;
    if (guard.kind !== "started") return Response.json({ error: "화면을 새로 연 뒤 다시 처리해 주세요." }, { status: 400 });
    const response = await performAction(request);
    if (response.ok) await audit(auth.client, auth.user.userId, "operation:" + String(data.action), String(data.action), String(data.id), undefined, { status: data.status, note: data.note, hidden: data.hidden });
    await completeIdempotentRequest(guard, await response.clone().json(), response.status);
    return response;
  } catch (error) {
    // Keep an uncertain request claimed: retrying partial side effects could duplicate them.
    if (error && typeof error === "object" && "code" in error && error.code === "PGRST116") return Response.json({ error: "다른 작업에서 상태가 바뀌었어요. 목록을 새로 불러와 확인해 주세요." }, { status: 409 });
    logError("operations.action_failed", error);
    return Response.json({ error: "처리 결과를 확인하지 못했어요. 목록과 처리 기록을 확인한 뒤 다시 진행해 주세요." }, { status: 503 });
  }
}

async function performAction(request: Request) {
  const auth = await context(); if (!auth) return Response.json({ error: "본인 확인이 필요합니다." }, { status: 401 });
  if (!canUseOperations(auth.member.role, auth.member.verified, auth.member.sanctioned)) return Response.json({ error: "운영자 권한이 필요합니다." }, { status: 403 });
  const c = auth.client, data = await request.json() as Record<string, unknown>, action = clean(data.action, 40), id = Number(data.id), note = clean(data.note, 500), admin = auth.member.role === "admin";
  if (note.length < 2) return Response.json({ error: "처리 사유를 2자 이상 입력해 주세요." }, { status: 400 });
  if (!admin && !["application-status", "guardian-message", "return-status", "guardian-confirm-handover"].includes(action)) return Response.json({ error: "운영자만 처리할 수 있어요." }, { status: 403 });
  const statusTables: Record<string, string> = { "application-status": "applications", "registration-status": "direct_animals", "verification-status": "verification_requests", "return-status": "return_requests", "adoption-certification-status": "adoption_certifications", "appeal-status": "sanction_appeals", "fundraiser-status": "fundraisers" };
  const statusTable = statusTables[action];
  if (statusTable) {
    const { data: previous } = await c.from(statusTable).select("*").eq("id", id).maybeSingle().throwOnError();
    if (!previous) return Response.json({ error: "처리할 항목을 찾지 못했어요." }, { status: 404 });
    if (!admin && action === "application-status" && previous.guardian_id !== auth.user.userId) return Response.json({ error: "담당 신청만 처리할 수 있어요." }, { status: 403 });
    if (typeof data.expectedStatus !== "string" || previous.status !== data.expectedStatus || previous.status === data.status) return Response.json({ error: "상태가 바뀌었어요. 목록을 새로 불러와 확인해 주세요." }, { status: 409 });
    const allowedFrom: Record<string, string[]> = { "application-status": ["submitted", "review", "consulting"], "registration-status": ["review", "published"], "verification-status": ["submitted"], "return-status": ["open", "connected"], "adoption-certification-status": ["submitted"], "appeal-status": ["submitted"], "fundraiser-status": ["review"] };
    if (!allowedFrom[action].includes(String(previous.status))) return Response.json({ error: "이미 검토가 끝난 항목이에요." }, { status: 409 });
  }
  if (action === "application-status") {
    const status = clean(data.status, 30), allowed = ["consulting", "approved", "rejected"];
    if (!allowed.includes(status)) return Response.json({ error: "상태를 확인해 주세요." }, { status: 400 });
    const { data: current } = await c.from("applications").select("*").eq("id", id).maybeSingle().throwOnError(); if (!current || (!admin && current.guardian_id !== auth.user.userId)) return Response.json({ error: "담당 신청만 처리할 수 있습니다." }, { status: 403 });
    const { data: row } = await c.from("applications").update({ status }).eq("id", id).eq("status", String(data.expectedStatus)).select("*").single().throwOnError(); await c.from("application_events").insert({ application_id: id, actor_id: auth.user.userId, event_type: `status:${status}`, note }).throwOnError(); await c.from("notifications").insert({ member_id: current.member_id, type: "application_status", title: "입양 신청 상태가 변경됐어요", body: `신청 #${id}: ${status}`, href: `/applications/${id}` }).throwOnError(); await sendExternalNotification({ memberId: current.member_id, title: "입양 신청 상태 변경", body: status });
    const shelterTransfer = status === "review" ? await sendToOfficialShelter({ applicationId: id, animalId: current.animal_id }) : null; return Response.json({ row: row ? map(row) : null, shelterTransfer });
  }
  if (action === "guardian-message") {
    const { data: current } = await c.from("applications").select("*").eq("id", id).maybeSingle().throwOnError(), body = clean(data.body, 1000); if (!current || (!admin && current.guardian_id !== auth.user.userId)) return Response.json({ error: "담당 신청만 상담할 수 있습니다." }, { status: 403 }); if (body.length < 2) return Response.json({ error: "메시지를 입력해 주세요." }, { status: 400 }); const { data: message } = await c.from("application_messages").insert({ application_id: id, sender_id: auth.user.userId, body }).select("*").single().throwOnError(); await c.from("notifications").insert({ member_id: current.member_id, type: "application_message", title: "보호처에서 상담 메시지가 왔어요", body: body.slice(0, 100), href: `/applications/${id}` }).throwOnError(); return Response.json({ message }, { status: 201 });
  }
  if (action === "return-status") {
    const status = clean(data.status, 20); if (!["connected", "resolved"].includes(status)) return Response.json({ error: "상태를 확인해 주세요." }, { status: 400 }); const { data: requestRow } = await c.from("return_requests").select("*").eq("id", id).maybeSingle().throwOnError(); const { data: application } = requestRow ? await c.from("applications").select("*").eq("id", requestRow.application_id).maybeSingle().throwOnError() : { data: null }; if (!requestRow || !application || (!admin && application.guardian_id !== auth.user.userId)) return Response.json({ error: "담당 요청만 처리할 수 있습니다." }, { status: 403 }); const { data: row } = await c.from("return_requests").update({ status }).eq("id", id).eq("status", String(data.expectedStatus)).select("*").single().throwOnError(); await c.from("notifications").insert({ member_id: requestRow.member_id, type: "return_support", title: "돌봄 위기 도움 상태가 바뀌었어요", body: status === "connected" ? "보호처가 상담·임시돌봄 연결을 확인하고 있어요." : "도움 요청이 해결됨으로 기록됐어요.", href: `/applications/${requestRow.application_id}` }).throwOnError(); return Response.json({ row: row ? map(row) : null });
  }
  if (action === "registration-status") { if (!admin) return Response.json({ error: "직접 등록 공개 심사는 운영자만 할 수 있습니다." }, { status: 403 }); const status = clean(data.status, 20); if (!["published", "closed"].includes(status)) return Response.json({ error: "상태를 확인해 주세요." }, { status: 400 }); const { data: row } = await c.from("direct_animals").update({ status, updated_at: new Date().toISOString() }).eq("id", id).eq("status", String(data.expectedStatus)).select("*").single().throwOnError(); return Response.json({ row: row ? map(row) : null }); }
  if (action === "moderate") { if (!admin) return Response.json({ error: "안전 조치는 운영자만 할 수 있습니다." }, { status: 403 }); await c.from("moderation_actions").insert({ actor_id: auth.user.userId, target_type: clean(data.targetType, 30), target_id: clean(data.targetId, 40), action: clean(data.moderationAction, 40), reason: note || "운영 정책에 따른 조치" }).throwOnError(); return Response.json({ ok: true }); }
  if (action === "verification-status") { if (!admin) return Response.json({ error: "역할 인증 심사는 운영자만 할 수 있습니다." }, { status: 403 }); const status = clean(data.status, 20); if (!["verified", "rejected"].includes(status)) return Response.json({ error: "심사 상태를 확인해 주세요." }, { status: 400 }); const { data: before } = await c.from("verification_requests").select("*").eq("id", id).maybeSingle().throwOnError(); if (!before || !before.evidence_key || !["foster", "shelter", "veterinarian"].includes(String(before.requested_role))) return Response.json({ error: "인증 요청과 역할을 확인해 주세요." }, { status: 400 }); const { data: row } = await c.from("verification_requests").update({ status, reviewed_by: auth.user.userId }).eq("id", id).eq("status", String(data.expectedStatus)).select("*").single().throwOnError(); if (row && status === "verified") await c.from("members").update({ role: row.requested_role, verified: true }).eq("id", row.member_id).throwOnError(); await audit(c, auth.user.userId, `verification:${status}`, "verification", String(id), before, row); return Response.json({ row: row ? map(row) : null }); }
  if (action === "post-visibility") { if (!admin) return Response.json({ error: "게시물 안전 조치는 운영자만 할 수 있습니다." }, { status: 403 }); const hidden = data.hidden === true; const { data: before } = await c.from("posts").select("*").eq("id", id).maybeSingle().throwOnError(); if (!before) return Response.json({ error: "게시물을 찾지 못했어요." }, { status: 404 }); if (before.hidden === hidden) return Response.json({ error: "이미 처리된 게시물이에요." }, { status: 409 }); const { data: row } = await c.from("posts").update({ hidden }).eq("id", id).eq("hidden", before.hidden).select("*").single().throwOnError(); await audit(c, auth.user.userId, hidden ? "post:hidden" : "post:restored", "post", String(id), before, row); return Response.json({ row: row ? map(row) : null }); }
  if (action === "adoption-certification-status") { if (!admin) return Response.json({ error: "입양 인증 심사는 운영자만 할 수 있습니다." }, { status: 403 }); const status = clean(data.status, 20); if (!["verified", "rejected"].includes(status)) return Response.json({ error: "상태를 확인해 주세요." }, { status: 400 }); const { data: row } = await c.from("adoption_certifications").update({ status, reviewed_by: auth.user.userId }).eq("id", id).eq("status", String(data.expectedStatus)).select("*").maybeSingle().throwOnError(); if (!row) return Response.json({ error: "인증 요청을 찾을 수 없습니다." }, { status: 404 }); await audit(c, auth.user.userId, `adoption-certification:${status}`, "adoption-certification", String(id), undefined, row); await c.from("notifications").insert({ member_id: row.member_id, type: "adoption_certification", title: "입양 인증 검토 결과", body: status === "verified" ? "입양 인증이 완료되어 입양 일기를 작성할 수 있어요." : "입양 인증 자료를 다시 확인해 주세요.", href: "/adoption-verification" }).throwOnError(); return Response.json({ row: map(row) }); }
  if (action === "appeal-status") { if (!admin) return Response.json({ error: "이의제기 심사는 운영자만 할 수 있습니다." }, { status: 403 }); const status = clean(data.status, 20); const { data: appeal } = await c.from("sanction_appeals").select("*").eq("id", id).maybeSingle().throwOnError(); if (!appeal || !["accepted", "rejected"].includes(status)) return Response.json({ error: "이의제기와 상태를 확인해 주세요." }, { status: 400 }); const { data: row } = await c.from("sanction_appeals").update({ status, reviewed_by: auth.user.userId }).eq("id", id).eq("status", String(data.expectedStatus)).select("*").single().throwOnError(); await c.from("account_sanctions").update({ status: status === "accepted" ? "lifted" : "confirmed" }).eq("id", appeal.sanction_id).throwOnError(); if (status === "accepted") await c.from("members").update({ sanctioned: false }).eq("id", appeal.member_id).throwOnError(); await audit(c, auth.user.userId, `appeal:${status}`, "sanction-appeal", String(id), undefined, row); return Response.json({ row: row ? map(row) : null }); }
  if (action === "account-sanction-target") {
    if (!admin) return Response.json({ error: "계정 제재 확정은 운영자만 할 수 있습니다." }, { status: 403 });
    const { data: report } = await c.from("reports").select("*").eq("id", id).maybeSingle().throwOnError(); if (!report) return Response.json({ error: "신고를 찾을 수 없습니다." }, { status: 404 });
    let memberId = "";
    if (report.target_type === "post") { const { data: target } = await c.from("posts").select("member_id").eq("id", Number(report.target_id)).maybeSingle().throwOnError(); memberId = String(target?.member_id || ""); }
    else if (report.target_type === "animal" && String(report.target_id).startsWith("direct-")) { const { data: target } = await c.from("direct_animals").select("member_id").eq("id", Number(String(report.target_id).slice(7))).maybeSingle().throwOnError(); memberId = String(target?.member_id || ""); }
    if (!memberId) return Response.json({ error: "신고 대상 계정을 확인할 수 없어 제재하지 않았습니다." }, { status: 422 });
    const { data: target } = await c.from("members").select("email,role,sanctioned").eq("id", memberId).maybeSingle().throwOnError(); if (!target) return Response.json({ error: "계정을 찾을 수 없습니다." }, { status: 404 });
    if (target.role === "admin" || memberId === auth.user.userId) return Response.json({ error: "운영자 계정은 이 화면에서 제재할 수 없어요." }, { status: 403 });
    if (target.sanctioned) return Response.json({ error: "이미 이용이 제한된 계정이에요." }, { status: 409 });
    const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(String(target.email).trim().toLowerCase())), fingerprintHash = Array.from(new Uint8Array(digest), v => v.toString(16).padStart(2, "0")).join(""), reason = note || "운영자 신고 검토 후 확정";
    await c.from("members").update({ sanctioned: true }).eq("id", memberId).eq("sanctioned", false).select("id").single().throwOnError(); const { data: row } = await c.from("account_sanctions").insert({ member_id: memberId, actor_id: auth.user.userId, reason, status: "confirmed", fingerprint_hash: fingerprintHash }).select("*").single().throwOnError(); await audit(c, auth.user.userId, "account:sanctioned", "member", memberId, undefined, { reason, reportId: id }); return Response.json({ row });
  }
  if (action === "fundraiser-status") { if (!admin) return Response.json({ error: "모금 공개 심사는 운영자만 할 수 있습니다." }, { status: 403 }); const status = clean(data.status, 20); if (!["open", "rejected", "settled"].includes(status)) return Response.json({ error: "모금 상태를 확인해 주세요." }, { status: 400 }); const { data: before } = await c.from("fundraisers").select("*").eq("id", id).maybeSingle().throwOnError(); if (!before) return Response.json({ error: "모금 신청을 찾을 수 없습니다." }, { status: 404 }); const { data: row } = await c.from("fundraisers").update({ status }).eq("id", id).eq("status", String(data.expectedStatus)).select("*").single().throwOnError(); await audit(c, auth.user.userId, `fundraiser:${status}`, "fundraiser", String(id), before, row); return Response.json({ row: row ? map(row) : null }); }
  if (action === "guardian-confirm-handover") { const { data: application } = await c.from("applications").select("*").eq("id", id).maybeSingle().throwOnError(); if (!application || (!admin && application.guardian_id !== auth.user.userId)) return Response.json({ error: "담당 신청만 인계 확인할 수 있습니다." }, { status: 403 }); const { data: reservation } = await c.from("handover_reservations").select("*").eq("application_id", id).maybeSingle().throwOnError(); if (!["approved", "handover"].includes(application.status) || reservation?.guardian_confirmed) return Response.json({ error: "인계 가능한 상태인지 다시 확인해 주세요." }, { status: 409 }); if (!reservation) return Response.json({ error: "인계 예약을 찾을 수 없습니다." }, { status: 404 }); await c.from("handover_reservations").update({ guardian_confirmed: true, status: reservation.adopter_confirmed ? "completed" : "confirmed" }).eq("application_id", id).eq("guardian_confirmed", false).select("application_id").single().throwOnError(); if (reservation.adopter_confirmed) await c.from("applications").update({ status: "completed" }).eq("id", id).throwOnError(); await audit(c, auth.user.userId, "handover:guardian-confirmed", "application", String(id), undefined, { guardianConfirmed: true }); return Response.json({ ok: true }); }
  return Response.json({ error: "지원하지 않는 작업입니다." }, { status: 400 });
}
