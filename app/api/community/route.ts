import { and, desc, eq, sql } from "drizzle-orm";
import { getDb } from "../../../db";
import {
  animalNameSuggestions,
  animalNameVotes,
  communityAnswers,
  communityQuestions,
  drawingMatches,
  drawingPosts,
  fundraiserPledges,
  fundraisers,
  members,
  shelterProfiles,
  volunteerBadges,
} from "../../../db/schema";
import { authenticatedDb, clean } from "../_helpers";

export async function GET(request: Request) {
  const url = new URL(request.url),
    type = url.searchParams.get("type"),
    id = clean(url.searchParams.get("id"), 120),
    db = getDb();
  if (type === "drawings") {
    const posts = await db
        .select()
        .from(drawingPosts)
        .orderBy(desc(drawingPosts.createdAt))
        .limit(50),
      matches = posts.length
        ? await db
            .select()
            .from(drawingMatches)
            .orderBy(desc(drawingMatches.createdAt))
            .limit(200)
        : [];
    return Response.json({
      posts: posts.map((post) => ({
        ...post,
        matches: matches.filter((match) => match.postId === post.id),
      })),
    });
  }
  if (type === "names") {
    const suggestions = await db
      .select()
      .from(animalNameSuggestions)
      .where(eq(animalNameSuggestions.animalId, id))
      .orderBy(desc(animalNameSuggestions.votes));
    return Response.json({ suggestions });
  }
  if (type === "questions") {
    const questions = await db
        .select()
        .from(communityQuestions)
        .orderBy(desc(communityQuestions.createdAt))
        .limit(50),
      answers = await db
        .select()
        .from(communityAnswers)
        .orderBy(desc(communityAnswers.helpful))
        .limit(200),
      memberRows = await db.select().from(members),
      memberMap = new Map(memberRows.map((member) => [member.id, member]));
    return Response.json({
      questions: questions.map((question) => ({
        ...question,
        answers: answers
          .filter((answer) => answer.questionId === question.id)
          .map((answer) => ({
            ...answer,
            author: memberMap.get(answer.memberId)?.displayName || "회원",
            expert: memberMap.get(answer.memberId)?.role === "veterinarian",
          })),
      })),
    });
  }
  if (type === "fundraisers") {
    const rows = await db
      .select()
      .from(fundraisers)
      .where(eq(fundraisers.animalId, id))
      .orderBy(desc(fundraisers.createdAt));
    return Response.json({ fundraisers: rows });
  }
  if (type === "reputation") {
    const memberId = id,
      selected = await db
        .select()
        .from(drawingMatches)
        .where(
          and(
            eq(drawingMatches.memberId, memberId),
            eq(drawingMatches.selected, true),
          ),
        ),
      badges = await db
        .select()
        .from(volunteerBadges)
        .where(eq(volunteerBadges.memberId, memberId)),
      points = selected.reduce((sum, row) => sum + row.points, 0);
    return Response.json({
      points,
      badges,
      grade:
        points >= 1000
          ? "퍼스트 프렌드 탐정"
          : points >= 300
            ? "매칭 메이트"
            : points >= 100
              ? "따뜻한 관찰자"
              : "새싹 친구",
    });
  }
  return Response.json({ error: "지원하지 않는 목록입니다." }, { status: 400 });
}

export async function POST(request: Request) {
  const auth = await authenticatedDb();
  if (!auth)
    return Response.json({ error: "로그인이 필요합니다." }, { status: 401 });
  const data = (await request.json()) as Record<string, unknown>,
    action = clean(data.action, 40);
  if (action === "drawing-create") {
    const title = clean(data.title, 100),
      description = clean(data.description, 500),
      imageKey = clean(data.imageKey, 300),
      species = clean(data.species, 10) as "cat" | "dog",
      tags = Array.isArray(data.tags)
        ? data.tags
            .map((value) => clean(value, 30))
            .filter(Boolean)
            .slice(0, 12)
        : [];
    if (!title || !imageKey || !["cat", "dog"].includes(species))
      return Response.json(
        { error: "그림·제목·동물 종류를 확인해 주세요." },
        { status: 400 },
      );
    const [post] = await auth.db
      .insert(drawingPosts)
      .values({
        memberId: auth.user.userId,
        title,
        description,
        imageKey,
        species,
        tagsJson: JSON.stringify(tags),
      })
      .returning();
    return Response.json({ post }, { status: 201 });
  }
  if (action === "drawing-match") {
    const postId = Number(data.postId),
      animalId = clean(data.animalId, 80),
      reason = clean(data.reason, 300);
    if (!postId || !animalId || reason.length < 5)
      return Response.json(
        { error: "닮은 친구와 이유를 적어주세요." },
        { status: 400 },
      );
    const [match] = await auth.db
      .insert(drawingMatches)
      .values({ postId, memberId: auth.user.userId, animalId, reason })
      .onConflictDoNothing()
      .returning();
    return Response.json({ match: match || null }, { status: 201 });
  }
  if (action === "drawing-select") {
    const id = Number(data.id),
      match = await auth.db.query.drawingMatches.findFirst({
        where: eq(drawingMatches.id, id),
      }),
      post = match
        ? await auth.db.query.drawingPosts.findFirst({
            where: eq(drawingPosts.id, match.postId),
          })
        : null;
    if (!match || post?.memberId !== auth.user.userId)
      return Response.json(
        { error: "게시자만 가장 닮은 답을 선택할 수 있어요." },
        { status: 403 },
      );
    await auth.db
      .update(drawingMatches)
      .set({ selected: true, points: 100 })
      .where(eq(drawingMatches.id, id));
    await auth.db
      .update(drawingPosts)
      .set({ status: "matched" })
      .where(eq(drawingPosts.id, post.id));
    return Response.json({ ok: true, points: 100 });
  }
  if (action === "name-suggest") {
    const animalId = clean(data.animalId, 80),
      name = clean(data.name, 20),
      reason = clean(data.reason, 200);
    if (!animalId || name.length < 1)
      return Response.json({ error: "이름을 적어주세요." }, { status: 400 });
    const [row] = await auth.db
      .insert(animalNameSuggestions)
      .values({ animalId, memberId: auth.user.userId, name, reason })
      .onConflictDoNothing()
      .returning();
    return Response.json({ suggestion: row || null }, { status: 201 });
  }
  if (action === "name-vote") {
    const suggestionId = Number(data.suggestionId),
      [vote] = await auth.db
        .insert(animalNameVotes)
        .values({ suggestionId, memberId: auth.user.userId })
        .onConflictDoNothing()
        .returning();
    if (vote)
      await auth.db
        .update(animalNameSuggestions)
        .set({ votes: sql`${animalNameSuggestions.votes}+1` })
        .where(eq(animalNameSuggestions.id, suggestionId));
    return Response.json({ voted: Boolean(vote) });
  }
  if (action === "name-select") {
    if (!["shelter", "admin"].includes(auth.member.role))
      return Response.json(
        { error: "입점 보호소 담당자만 최종 이름을 채택할 수 있어요." },
        { status: 403 },
      );
    const suggestionId = Number(data.suggestionId),
      suggestion = await auth.db.query.animalNameSuggestions.findFirst({
        where: eq(animalNameSuggestions.id, suggestionId),
      });
    if (!suggestion)
      return Response.json(
        { error: "이름 제안을 찾을 수 없어요." },
        { status: 404 },
      );
    await auth.db
      .update(animalNameSuggestions)
      .set({ selected: false })
      .where(eq(animalNameSuggestions.animalId, suggestion.animalId));
    const [row] = await auth.db
      .update(animalNameSuggestions)
      .set({ selected: true })
      .where(eq(animalNameSuggestions.id, suggestionId))
      .returning();
    return Response.json({ suggestion: row });
  }
  if (action === "question-create") {
    const category = clean(data.category, 20) as
        "adoption" | "health" | "behavior" | "care" | "shelter",
      title = clean(data.title, 120),
      body = clean(data.body, 1500);
    if (
      !["adoption", "health", "behavior", "care", "shelter"].includes(
        category,
      ) ||
      title.length < 5 ||
      body.length < 20
    )
      return Response.json(
        { error: "질문 제목과 20자 이상의 내용을 확인해 주세요." },
        { status: 400 },
      );
    const [row] = await auth.db
      .insert(communityQuestions)
      .values({ memberId: auth.user.userId, category, title, body })
      .returning();
    return Response.json({ question: row }, { status: 201 });
  }
  if (action === "answer-create") {
    const questionId = Number(data.questionId),
      body = clean(data.body, 2000);
    if (!questionId || body.length < 20)
      return Response.json(
        { error: "20자 이상의 답변을 적어주세요." },
        { status: 400 },
      );
    const [row] = await auth.db
      .insert(communityAnswers)
      .values({ questionId, memberId: auth.user.userId, body })
      .returning();
    await auth.db
      .update(communityQuestions)
      .set({ status: "answered" })
      .where(eq(communityQuestions.id, questionId));
    return Response.json({ answer: row }, { status: 201 });
  }
  if (action === "fundraiser-create") {
    if (!["shelter", "admin"].includes(auth.member.role))
      return Response.json(
        { error: "인증 보호소만 캠페인을 신청할 수 있어요." },
        { status: 403 },
      );
    const animalId = clean(data.animalId, 80),
      title = clean(data.title, 120),
      purpose = clean(data.purpose, 1000),
      targetAmount = Math.max(
        10000,
        Math.min(100000000, Number(data.targetAmount) || 0),
      ),
      profile = await auth.db.query.shelterProfiles.findFirst({
        where: eq(shelterProfiles.ownerId, auth.user.userId),
      });
    if (!profile || !animalId || title.length < 5 || purpose.length < 30)
      return Response.json(
        { error: "동물·목표금액·치료 또는 지원 근거를 확인해 주세요." },
        { status: 400 },
      );
    const [row] = await auth.db
      .insert(fundraisers)
      .values({
        shelterId: profile.id,
        animalId,
        title,
        purpose,
        targetAmount,
        status: "review",
      })
      .returning();
    return Response.json({ fundraiser: row }, { status: 201 });
  }
  if (action === "fund-pledge") {
    const fundraiserId = Number(data.fundraiserId),
      amount = Math.max(1000, Math.min(1000000, Number(data.amount) || 0)),
      campaign = await auth.db.query.fundraisers.findFirst({
        where: eq(fundraisers.id, fundraiserId),
      });
    if (!campaign || campaign.status !== "open")
      return Response.json(
        { error: "현재 참여 가능한 검증 캠페인이 아니에요." },
        { status: 400 },
      );
    const [row] = await auth.db
      .insert(fundraiserPledges)
      .values({
        fundraiserId,
        memberId: auth.user.userId,
        amount,
        status: "pledged",
      })
      .returning();
    return Response.json(
      {
        pledge: row,
        message:
          "결제 연동 전 참여 의향으로 기록됐으며 아직 청구되지 않았어요.",
      },
      { status: 201 },
    );
  }
  return Response.json({ error: "지원하지 않는 요청입니다." }, { status: 400 });
}
