import { and, asc, eq, or } from "drizzle-orm";
import { lostMatches, lostMessages, lostReports, lostTimelineEvents, notifications } from "../../../../db/schema";
import { authenticatedDb, clean } from "../../_helpers";

async function context(id: number) {
  const auth = await authenticatedDb();
  if (!auth) return null;
  const report = await auth.db.query.lostReports.findFirst({ where: eq(lostReports.id, id) });
  if (!report) return { auth, report: null, related: [], allowed: false };
  const matches = await auth.db.select().from(lostMatches).where(or(eq(lostMatches.lostReportId, id), eq(lostMatches.foundReportId, id)));
  const relatedIds = matches.map((match) => match.lostReportId === id ? match.foundReportId : match.lostReportId);
  const related = relatedIds.length
    ? (await Promise.all(relatedIds.map((relatedId) => auth.db.query.lostReports.findFirst({ where: eq(lostReports.id, relatedId) })))).filter(Boolean)
    : [];
  const allowed = report.memberId === auth.user.userId || related.some((item) => item?.memberId === auth.user.userId);
  return { auth, report, matches, related, allowed };
}

export async function GET(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id: rawId } = await params;
  const state = await context(Number(rawId));
  if (!state) return Response.json({ error: "로그인이 필요합니다." }, { status: 401 });
  if (!state.report) return Response.json({ error: "신고를 찾을 수 없습니다." }, { status: 404 });
  if (!state.allowed) return Response.json({ error: "연결된 당사자만 볼 수 있습니다." }, { status: 403 });
  const [messages, timeline] = await Promise.all([
    state.auth.db.select().from(lostMessages).where(eq(lostMessages.reportId, state.report.id)).orderBy(asc(lostMessages.createdAt)),
    state.auth.db.select().from(lostTimelineEvents).where(eq(lostTimelineEvents.reportId, state.report.id)).orderBy(asc(lostTimelineEvents.occurredAt)),
  ]);
  return Response.json({ report: state.report, matches: state.matches, related: state.related.map((item) => item && ({ id: item.id, kind: item.kind, species: item.species, region: item.region, description: item.description })), messages, timeline, me: state.auth.user.userId, owner: state.report.memberId === state.auth.user.userId });
}

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id: rawId } = await params;
  const state = await context(Number(rawId));
  if (!state) return Response.json({ error: "로그인이 필요합니다." }, { status: 401 });
  if (!state.report) return Response.json({ error: "신고를 찾을 수 없습니다." }, { status: 404 });
  if (!state.allowed) return Response.json({ error: "연결된 당사자만 참여할 수 있습니다." }, { status: 403 });
  const data = await request.json() as Record<string, unknown>;
  const action = clean(data.action, 30);
  if (action === "message") {
    const answer = clean(data.answer, 300), body = clean(data.body, 1200);
    if (body.length < 5) return Response.json({ error: "메시지를 5자 이상 적어주세요." }, { status: 400 });
    const safeBody = state.report.memberId === state.auth.user.userId ? body : `[소유 확인 답변] ${answer || "미입력"}\n${body}`;
    const [message] = await state.auth.db.insert(lostMessages).values({ reportId: state.report.id, senderId: state.auth.user.userId, body: safeBody }).returning();
    await state.auth.db.update(lostReports).set({ status: "contacting" }).where(and(eq(lostReports.id, state.report.id), eq(lostReports.status, "active")));
    if (state.report.memberId !== state.auth.user.userId) await state.auth.db.insert(notifications).values({ memberId: state.report.memberId, type: "lost_contact", title: "실종·발견 연결 메시지가 왔어요", body: "연락처와 정확한 장소를 공개하지 않은 상태로 답변을 확인할 수 있어요.", href: `/lost-found/${state.report.id}` });
    return Response.json({ message }, { status: 201 });
  }
  if (action === "timeline") {
    const region = clean(data.region, 80).split(" ").slice(0, 3).join(" "), occurredAt = clean(data.occurredAt, 40), note = clean(data.note, 500);
    if (!region || !occurredAt || note.length < 5) return Response.json({ error: "대략 위치·시각·내용을 확인해 주세요." }, { status: 400 });
    const [event] = await state.auth.db.insert(lostTimelineEvents).values({ reportId: state.report.id, memberId: state.auth.user.userId, region, occurredAt, note }).returning();
    return Response.json({ event }, { status: 201 });
  }
  if (action === "status") {
    if (state.report.memberId !== state.auth.user.userId) return Response.json({ error: "신고자만 종료할 수 있습니다." }, { status: 403 });
    const status = clean(data.status, 20) as "resolved" | "closed";
    if (!['resolved', 'closed'].includes(status)) return Response.json({ error: "상태를 확인해 주세요." }, { status: 400 });
    await state.auth.db.update(lostReports).set({ status }).where(eq(lostReports.id, state.report.id));
    return Response.json({ ok: true, status });
  }
  return Response.json({ error: "지원하지 않는 요청입니다." }, { status: 400 });
}
