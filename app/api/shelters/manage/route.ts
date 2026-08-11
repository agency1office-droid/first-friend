import { and, desc, eq, isNull } from "drizzle-orm";
import { applications, notifications, shelterFollows, shelterNeeds, shelterProfiles, shelterUpdates, supportRecords, volunteerApplications, volunteerBadges, volunteerPosts } from "../../../../db/schema";
import { authenticatedDb, clean } from "../../_helpers";

async function owner() {
  const auth = await authenticatedDb();
  if (!auth) return null;
  if (!((auth.member.role === "shelter" && auth.member.verified) || auth.member.role === "admin")) return { auth, forbidden: true as const, profile: null };
  const profile = await auth.db.query.shelterProfiles.findFirst({ where: eq(shelterProfiles.ownerId, auth.user.userId) });
  return { auth, forbidden: false as const, profile };
}

export async function GET() {
  const state = await owner();
  if (!state) return Response.json({ error: "로그인이 필요합니다." }, { status: 401 });
  if (state.forbidden) return Response.json({ error: "보호소 인증 승인 후 이용할 수 있습니다." }, { status: 403 });
  if (!state.profile) return Response.json({ profile: null, updates: [], volunteers: [], needs: [], applications: [] });
  const [updates, volunteers, needs] = await Promise.all([
    state.auth.db.select().from(shelterUpdates).where(eq(shelterUpdates.shelterId, state.profile.id)).orderBy(desc(shelterUpdates.createdAt)),
    state.auth.db.select().from(volunteerPosts).where(eq(volunteerPosts.shelterId, state.profile.id)).orderBy(desc(volunteerPosts.createdAt)),
    state.auth.db.select().from(shelterNeeds).where(eq(shelterNeeds.shelterId, state.profile.id)),
  ]);
  const volunteerApplicants = volunteers.length ? (await Promise.all(volunteers.map(post => state.auth.db.select().from(volunteerApplications).where(eq(volunteerApplications.postId, post.id))))).flat() : [];
  const adoptionApplications = await state.auth.db.select().from(applications).where(eq(applications.guardianId, state.auth.user.userId)).orderBy(desc(applications.createdAt));
  return Response.json({ profile: state.profile, updates, volunteers, needs, applications: volunteerApplicants, adoptionApplications });
}

export async function POST(request: Request) {
  const state = await owner();
  if (!state) return Response.json({ error: "로그인이 필요합니다." }, { status: 401 });
  if (state.forbidden) return Response.json({ error: "보호소 인증 승인 후 이용할 수 있습니다." }, { status: 403 });
  const data = await request.json() as Record<string, unknown>, action = clean(data.action, 30);

  if (action === "profile") {
    const name = clean(data.name, 120), region = clean(data.region, 80), introduction = clean(data.introduction, 1000), publicId = clean(data.publicId, 120) || `direct-shelter-${state.auth.user.userId}`;
    if (!name || !region || introduction.length < 20) return Response.json({ error: "이름·지역·소개를 확인해 주세요." }, { status: 400 });
    if (state.profile) {
      await state.auth.db.update(shelterProfiles).set({ name, region, introduction }).where(eq(shelterProfiles.id, state.profile.id));
    } else {
      const existing = await state.auth.db.query.shelterProfiles.findFirst({ where: eq(shelterProfiles.publicId, publicId) });
      if (existing?.ownerId && existing.ownerId !== state.auth.user.userId) return Response.json({ error: "이미 관리자가 연결된 보호소입니다." }, { status: 409 });
      if (existing) await state.auth.db.update(shelterProfiles).set({ ownerId: state.auth.user.userId, name, region, introduction, verified: true }).where(eq(shelterProfiles.id, existing.id));
      else await state.auth.db.insert(shelterProfiles).values({ ownerId: state.auth.user.userId, publicId, name, region, introduction, verified: true });
    }
    // 입점 전 접수된 신청도 공공 보호소 ID를 기준으로 담당자 신청함에 자동 인계합니다.
    await state.auth.db.update(applications).set({ guardianId: state.auth.user.userId }).where(and(eq(applications.shelterPublicId, publicId), isNull(applications.guardianId)));
    return Response.json({ ok: true }, { status: state.profile ? 200 : 201 });
  }

  if (!state.profile) return Response.json({ error: "보호소 프로필을 먼저 저장해 주세요." }, { status: 400 });
  if (action === "update") {
    const title = clean(data.title, 120), body = clean(data.body, 2000), category = clean(data.category, 20) as "daily" | "urgent" | "result" | "notice";
    if (!title || body.length < 20) return Response.json({ error: "제목과 20자 이상의 소식을 적어주세요." }, { status: 400 });
    const [row] = await state.auth.db.insert(shelterUpdates).values({ shelterId: state.profile.id, authorId: state.auth.user.userId, title, body, category: ["daily", "urgent", "result", "notice"].includes(category) ? category : "daily" }).returning();
    const followers = await state.auth.db.select({ memberId: shelterFollows.memberId }).from(shelterFollows).where(eq(shelterFollows.shelterPublicId, state.profile.publicId));
    for (const follower of followers) await state.auth.db.insert(notifications).values({ memberId: follower.memberId, type: "shelter_update", title: `${state.profile.name} 새 소식`, body: title, href: `/shelters/${encodeURIComponent(state.profile.publicId)}#shelter-updates` });
    return Response.json({ row }, { status: 201 });
  }
  if (action === "volunteer") {
    const title = clean(data.title, 120), description = clean(data.description, 1000), scheduledAt = clean(data.scheduledAt, 80), capacity = Math.max(1, Math.min(100, Number(data.capacity) || 1)), category=clean(data.category,20) as "cleaning"|"photography"|"transport"|"medical"|"care"|"event";
    if (!title || description.length < 20 || !scheduledAt) return Response.json({ error: "봉사 내용과 일정을 확인해 주세요." }, { status: 400 });
    const [row] = await state.auth.db.insert(volunteerPosts).values({ shelterId: state.profile.id, title, description, category:["cleaning","photography","transport","medical","care","event"].includes(category)?category:"care", region: state.profile.region, scheduledAt, capacity }).returning();
    return Response.json({ row }, { status: 201 });
  }
  if (action === "need") {
    const itemName = clean(data.itemName, 120), targetQuantity = Math.max(1, Math.min(10000, Number(data.targetQuantity) || 1)), unitPrice = Math.max(0, Number(data.unitPrice) || 0);
    if (!itemName) return Response.json({ error: "필요 물품을 적어주세요." }, { status: 400 });
    const [row] = await state.auth.db.insert(shelterNeeds).values({ shelterId: state.profile.id, itemName, targetQuantity, unitPrice }).returning();
    return Response.json({ row }, { status: 201 });
  }
  if (action === "volunteer-application-status") {
    const id = Number(data.id), status = clean(data.status, 20) as "accepted" | "declined" | "completed";
    const application = await state.auth.db.query.volunteerApplications.findFirst({ where: eq(volunteerApplications.id, id) });
    const post = application ? await state.auth.db.query.volunteerPosts.findFirst({ where: eq(volunteerPosts.id, application.postId) }) : null;
    if (!application || post?.shelterId !== state.profile.id || !["accepted", "declined", "completed"].includes(status)) return Response.json({ error: "봉사 지원과 상태를 확인해 주세요." }, { status: 403 });
    const [row] = await state.auth.db.update(volunteerApplications).set({ status }).where(eq(volunteerApplications.id, id)).returning();
    if(status==="completed"){const labels:Record<string,string>={cleaning:"깨끗한 하루",photography:"프로필 사진가",transport:"안전 이동",medical:"의료 도움",care:"돌봄 메이트",event:"현장 지원"};await state.auth.db.insert(volunteerBadges).values({memberId:application.memberId,kind:"first",label:"첫 봉사"}).onConflictDoNothing();await state.auth.db.insert(volunteerBadges).values({memberId:application.memberId,kind:(post.category==="event"?"care":post.category)as"cleaning"|"photography"|"transport"|"medical"|"care",label:labels[post.category]||"돌봄 메이트"}).onConflictDoNothing()}
    return Response.json({ row });
  }
  if (action === "need-received") {
    const id = Number(data.id), need = await state.auth.db.query.shelterNeeds.findFirst({ where: eq(shelterNeeds.id, id) });
    if (!need || need.shelterId !== state.profile.id) return Response.json({ error: "필요 물품 관리 권한이 없습니다." }, { status: 403 });
    const received = Math.max(0, Math.min(need.targetQuantity, Number(data.receivedQuantity) || 0)), status = received >= need.targetQuantity ? "fulfilled" as const : "needed" as const;
    const [row] = await state.auth.db.update(shelterNeeds).set({ receivedQuantity: received, status }).where(eq(shelterNeeds.id, id)).returning();
    if (status === "fulfilled") await state.auth.db.update(supportRecords).set({ status: "confirmed" }).where(and(eq(supportRecords.kind, "shelter_item"), eq(supportRecords.targetId, String(id))));
    return Response.json({ row });
  }
  return Response.json({ error: "지원하지 않는 요청입니다." }, { status: 400 });
}
