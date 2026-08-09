import { and, asc, eq } from "drizzle-orm";
import { adoptionAgreements, applicationEvents, applicationMessages, applications, handoverReservations, notifications, returnRequests } from "../../../../db/schema";
import { registerLegalAgreement, requestVerifiedTransport } from "../../../../lib/integrations";
import { authenticatedDb, clean } from "../../_helpers";

async function ownedApplication(id: number) {
  const auth = await authenticatedDb();
  if (!auth || !Number.isInteger(id)) return null;
  const application = await auth.db.query.applications.findFirst({ where: and(eq(applications.id, id), eq(applications.memberId, auth.user.userId)) });
  return application ? { ...auth, application } : null;
}

export async function GET(_: Request, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  const owned = await ownedApplication(Number(id));
  if (!owned) return Response.json({ error: "신청을 찾을 수 없습니다." }, { status: 404 });
  const [agreement, handover, messages, returnRequest] = await Promise.all([
    owned.db.query.adoptionAgreements.findFirst({ where: eq(adoptionAgreements.applicationId, owned.application.id) }),
    owned.db.query.handoverReservations.findFirst({ where: eq(handoverReservations.applicationId, owned.application.id) }),
    owned.db.select().from(applicationMessages).where(eq(applicationMessages.applicationId, owned.application.id)).orderBy(asc(applicationMessages.createdAt)),
    owned.db.query.returnRequests.findFirst({ where: eq(returnRequests.applicationId, owned.application.id) }),
  ]);
  return Response.json({ application: owned.application, agreement, handover, messages, returnRequest });
}

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  const owned = await ownedApplication(Number(id));
  if (!owned) return Response.json({ error: "신청을 찾을 수 없습니다." }, { status: 404 });
  const data = await request.json() as Record<string, unknown>;
  const action = clean(data.action, 30);
  if (action === "message") {
    const body = clean(data.body, 1000);
    if (body.length < 2) return Response.json({ error: "메시지를 입력해 주세요." }, { status: 400 });
    const [message] = await owned.db.insert(applicationMessages).values({ applicationId: owned.application.id, senderId: owned.user.userId, body }).returning();
    return Response.json({ message }, { status: 201 });
  }
  if (action === "agreement") {
    if (owned.application.status !== "approved") return Response.json({ error: "승인 후 전자 약정을 작성할 수 있어요." }, { status: 412 });
    const signedName = clean(data.signedName, 80);
    if (signedName.length < 2 || data.allAccepted !== true) return Response.json({ error: "서명과 필수 약정 확인이 필요합니다." }, { status: 400 });
    const [agreement] = await owned.db.insert(adoptionAgreements).values({ applicationId: owned.application.id, memberId: owned.user.userId, signedName, termsJson: JSON.stringify({ truthfulInformation: true, lifelongCare: true, noResale: true, returnConsultation: true, abuseReporting: true }) }).onConflictDoNothing().returning();
    const registryReceipt = await registerLegalAgreement({ applicationId: owned.application.id, version: "first-friend-v1" });
    return Response.json({ agreement, registryReceipt }, { status: 201 });
  }
  if (action === "handover") {
    const agreement = await owned.db.query.adoptionAgreements.findFirst({ where: eq(adoptionAgreements.applicationId, owned.application.id) });
    if (!agreement) return Response.json({ error: "전자 약정을 먼저 완료해 주세요." }, { status: 412 });
    const method = clean(data.method, 20) as "visit" | "volunteer" | "transport";
    const scheduledAt = clean(data.scheduledAt, 40), region = clean(data.region, 80);
    if (!(["visit", "volunteer", "transport"] as string[]).includes(method) || !scheduledAt || !region) return Response.json({ error: "인계 방법·일시·지역을 확인해 주세요." }, { status: 400 });
    const checklist = ["이동장과 인식표 준비", "급여·투약 기록 인수", "이동 중 문 개방 금지", "도착 후 양측 인계 확인"];
    const [handover] = await owned.db.insert(handoverReservations).values({ applicationId: owned.application.id, method, scheduledAt, region, checklistJson: JSON.stringify(checklist) }).onConflictDoNothing().returning();
    const transportRequest = method === "transport" ? await requestVerifiedTransport({ applicationId: owned.application.id, region }) : null;
    return Response.json({ handover, transportRequest }, { status: 201 });
  }
  if (action === "confirm-handover") {
    await owned.db.update(handoverReservations).set({ adopterConfirmed: true }).where(eq(handoverReservations.applicationId, owned.application.id));
    return Response.json({ ok: true });
  }
  if (action === "withdraw") {
    if (owned.application.status === "approved") return Response.json({ error: "승인 후 철회는 보호처와 상담해 주세요." }, { status: 412 });
    await owned.db.update(applications).set({ status: "withdrawn" }).where(eq(applications.id, owned.application.id));
    return Response.json({ ok: true });
  }
  if (action === "return-support") {
    const urgency = clean(data.urgency, 20) as "consult"|"soon"|"emergency", reason = clean(data.reason, 2000), safeUntil = clean(data.safeUntil, 120);
    if (!(["consult","soon","emergency"] as string[]).includes(urgency) || reason.length < 20) return Response.json({ error:"현재 상황을 20자 이상 알려주세요." }, { status:400 });
    const [returnRequest] = await owned.db.insert(returnRequests).values({ applicationId:owned.application.id, memberId:owned.user.userId, urgency, reason, safeUntil }).returning();
    await owned.db.update(applications).set({ status:"return_support" }).where(eq(applications.id,owned.application.id));
    await owned.db.insert(applicationEvents).values({ applicationId:owned.application.id, actorId:owned.user.userId, eventType:"return_support_requested", note:`urgency:${urgency}` });
    await owned.db.insert(notifications).values({ memberId:owned.user.userId, type:"return_support", title:"돌봄 위기 도움 요청을 접수했어요", body:"운영자가 안전한 임시보호·원 보호처 상담 경로를 확인합니다.", href:`/applications/${owned.application.id}` });
    return Response.json({ returnRequest }, { status:201 });
  }
  return Response.json({ error: "지원하지 않는 요청입니다." }, { status: 400 });
}
