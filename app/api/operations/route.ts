import { desc, eq } from "drizzle-orm";
import { applicationEvents, applications, directAnimals, moderationActions, notifications, reports, verificationRequests } from "../../../db/schema";
import { sendExternalNotification, sendToOfficialShelter } from "../../../lib/integrations";
import { authenticatedDb, clean } from "../_helpers";

const operator = (role: string) => role === "admin" || role === "shelter";

export async function GET() {
  const auth = await authenticatedDb();
  if (!auth) return Response.json({ error: "본인 확인이 필요합니다." }, { status: 401 });
  // DUMMY DATA: 보호처 역할이 없는 계정에는 비식별 운영 데모만 반환합니다. 실제 데이터와 섞이지 않습니다.
  if (!operator(auth.member.role)) return Response.json({ demo: true, summary: { applications: 12, reviews: 4, reports: 2, returns: 1 }, applications: [{ id: "D-1042", animal: "하늘이", applicant: "김보호", status: "상담 중", score: 86 }, { id: "D-1041", animal: "호두", applicant: "이준비", status: "검토 중", score: 92 }], registrations: [{ id: "R-21", name: "콩이", status: "건강정보 확인" }], notice: "실제 보호처 권한이 부여되면 이 자리에 실데이터가 표시됩니다." });
  const [applicationRows, registrationRows, verificationRows, reportRows] = await Promise.all([
    auth.db.select().from(applications).orderBy(desc(applications.createdAt)).limit(50), auth.db.select().from(directAnimals).orderBy(desc(directAnimals.createdAt)).limit(50), auth.db.select().from(verificationRequests).orderBy(desc(verificationRequests.createdAt)).limit(30), auth.db.select().from(reports).orderBy(desc(reports.createdAt)).limit(50),
  ]);
  return Response.json({ demo: false, summary: { applications: applicationRows.length, reviews: registrationRows.filter(x => x.status === "review").length, reports: reportRows.length, returns: applicationRows.filter(x => x.status === "return_support").length }, applications: applicationRows, registrations: registrationRows, verifications: verificationRows, reports: reportRows });
}

export async function POST(request: Request) {
  const auth = await authenticatedDb();
  if (!auth) return Response.json({ error: "본인 확인이 필요합니다." }, { status: 401 });
  if (!operator(auth.member.role)) return Response.json({ error: "운영자 권한이 필요합니다." }, { status: 403 });
  const data = await request.json() as Record<string, unknown>;
  const action = clean(data.action, 40), id = Number(data.id), note = clean(data.note, 500);
  if (action === "application-status") {
    const allowed = ["review", "consulting", "approved", "rejected", "handover", "completed", "return_support"] as const;
    const candidate = clean(data.status, 30);
    if (!allowed.includes(candidate as typeof allowed[number])) return Response.json({ error: "상태를 확인해 주세요." }, { status: 400 });
    const status = candidate as typeof allowed[number];
    const [row] = await auth.db.update(applications).set({ status }).where(eq(applications.id, id)).returning();
    if (!row) return Response.json({ error: "신청을 찾을 수 없습니다." }, { status: 404 });
    await auth.db.insert(applicationEvents).values({ applicationId: id, actorId: auth.user.userId, eventType: `status:${status}`, note });
    await auth.db.insert(notifications).values({ memberId: row.memberId, type: "application_status", title: "입양 신청 상태가 변경됐어요", body: `신청 #${id}: ${status}`, href: `/applications/${id}` });
    await sendExternalNotification({ memberId: row.memberId, title: "입양 신청 상태 변경", body: status });
    const shelterTransfer = status === "review" ? await sendToOfficialShelter({ applicationId: id, animalId: row.animalId }) : null;
    return Response.json({ row, shelterTransfer });
  }
  if (action === "registration-status") {
    const status = clean(data.status, 20) as "published" | "closed";
    if (!(["published", "closed"] as string[]).includes(status)) return Response.json({ error: "상태를 확인해 주세요." }, { status: 400 });
    const [row] = await auth.db.update(directAnimals).set({ status, updatedAt: new Date().toISOString() }).where(eq(directAnimals.id, id)).returning();
    return Response.json({ row });
  }
  if (action === "moderate") {
    await auth.db.insert(moderationActions).values({ actorId: auth.user.userId, targetType: clean(data.targetType, 30), targetId: clean(data.targetId, 40), action: clean(data.moderationAction, 40), reason: note || "운영 정책에 따른 조치" });
    return Response.json({ ok: true });
  }
  return Response.json({ error: "지원하지 않는 작업입니다." }, { status: 400 });
}
