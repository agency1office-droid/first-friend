import { eq, sql } from "drizzle-orm";
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
  shelterProfiles,
} from "../../../db/schema";
import { authenticatedDb, clean } from "../_helpers";
import { getSupabaseServerClient } from "../../../lib/supabase/server";

type CommunityDb = ReturnType<typeof getDb>;

async function ensureAnimalCommunityTables(db: CommunityDb) {
  await db.run(sql.raw(`CREATE TABLE IF NOT EXISTS animal_name_suggestions (
    id integer PRIMARY KEY AUTOINCREMENT NOT NULL,
    animal_id text NOT NULL,
    member_id text NOT NULL,
    name text NOT NULL,
    reason text DEFAULT '' NOT NULL,
    votes integer DEFAULT 0 NOT NULL,
    selected integer DEFAULT false NOT NULL,
    created_at text DEFAULT CURRENT_TIMESTAMP NOT NULL,
    FOREIGN KEY (member_id) REFERENCES members(id)
  )`));
  await db.run(sql.raw("CREATE UNIQUE INDEX IF NOT EXISTS idx_animal_name_member_name ON animal_name_suggestions (animal_id, member_id, name)"));
  await db.run(sql.raw("CREATE INDEX IF NOT EXISTS idx_animal_name_votes ON animal_name_suggestions (animal_id, votes)"));
  await db.run(sql.raw(`CREATE TABLE IF NOT EXISTS animal_name_votes (
    id integer PRIMARY KEY AUTOINCREMENT NOT NULL,
    suggestion_id integer NOT NULL,
    member_id text NOT NULL,
    FOREIGN KEY (suggestion_id) REFERENCES animal_name_suggestions(id),
    FOREIGN KEY (member_id) REFERENCES members(id)
  )`));
  await db.run(sql.raw("CREATE UNIQUE INDEX IF NOT EXISTS idx_animal_name_vote_unique ON animal_name_votes (suggestion_id, member_id)"));
  await db.run(sql.raw(`CREATE TABLE IF NOT EXISTS fundraisers (
    id integer PRIMARY KEY AUTOINCREMENT NOT NULL,
    shelter_id integer NOT NULL,
    animal_id text NOT NULL,
    title text NOT NULL,
    purpose text NOT NULL,
    target_amount integer NOT NULL,
    raised_amount integer DEFAULT 0 NOT NULL,
    evidence_key text,
    status text DEFAULT 'review' NOT NULL,
    created_at text DEFAULT CURRENT_TIMESTAMP NOT NULL,
    FOREIGN KEY (shelter_id) REFERENCES shelter_profiles(id)
  )`));
  await db.run(sql.raw("CREATE INDEX IF NOT EXISTS idx_fundraisers_status_created ON fundraisers (status, created_at)"));
  await db.run(sql.raw(`CREATE TABLE IF NOT EXISTS fundraiser_pledges (
    id integer PRIMARY KEY AUTOINCREMENT NOT NULL,
    fundraiser_id integer NOT NULL,
    member_id text NOT NULL,
    amount integer NOT NULL,
    status text DEFAULT 'pledged' NOT NULL,
    created_at text DEFAULT CURRENT_TIMESTAMP NOT NULL,
    FOREIGN KEY (fundraiser_id) REFERENCES fundraisers(id),
    FOREIGN KEY (member_id) REFERENCES members(id)
  )`));
  await db.run(sql.raw("CREATE INDEX IF NOT EXISTS idx_fundraiser_pledges_campaign ON fundraiser_pledges (fundraiser_id, created_at)"));
}

export async function GET(request: Request) {
  const url = new URL(request.url), type = url.searchParams.get("type"), id = clean(url.searchParams.get("id"), 120), client = getSupabaseServerClient();
  if (type === "drawings") {
    const { data: posts } = await client.from("drawing_posts").select("*").order("created_at", { ascending: false }).limit(50);
    const { data: matches } = await client.from("drawing_matches").select("*").order("created_at", { ascending: false }).limit(200);
    return Response.json({ posts: (posts || []).map(post => ({ ...post, memberId: post.member_id, imageKey: post.image_key, tagsJson: post.tags_json, createdAt: post.created_at, matches: (matches || []).filter(match => match.post_id === post.id).map(match => ({ ...match, postId: match.post_id, memberId: match.member_id, animalId: match.animal_id, createdAt: match.created_at })) })) });
  }
  if (type === "names") {
    const { data } = await client.from("animal_name_suggestions").select("*").eq("animal_id", id).order("votes", { ascending: false });
    return Response.json({ suggestions: (data || []).map(row => ({ ...row, animalId: row.animal_id, memberId: row.member_id, createdAt: row.created_at })) });
  }
  if (type === "questions") {
    const [{ data: questions }, { data: answers }, { data: memberRows }] = await Promise.all([client.from("community_questions").select("*").order("created_at", { ascending: false }).limit(50), client.from("community_answers").select("*").order("helpful", { ascending: false }).limit(200), client.from("members").select("id,display_name,role")]);
    const memberMap = new Map((memberRows || []).map(member => [member.id, member]));
    return Response.json({ questions: (questions || []).map(question => ({ ...question, memberId: question.member_id, createdAt: question.created_at, answers: (answers || []).filter(answer => answer.question_id === question.id).map(answer => ({ ...answer, questionId: answer.question_id, memberId: answer.member_id, createdAt: answer.created_at, author: memberMap.get(answer.member_id)?.display_name || "회원", expert: memberMap.get(answer.member_id)?.role === "veterinarian" })) })) });
  }
  if (type === "fundraisers") {
    const { data } = await client.from("fundraisers").select("*").eq("animal_id", id).order("created_at", { ascending: false });
    return Response.json({ fundraisers: (data || []).map(row => ({ ...row, shelterId: row.shelter_id, animalId: row.animal_id, targetAmount: row.target_amount, raisedAmount: row.raised_amount, evidenceKey: row.evidence_key, createdAt: row.created_at })) });
  }
  if (type === "reputation") {
    const [{ data: selected }, { data: badges }] = await Promise.all([client.from("drawing_matches").select("points").eq("member_id", id).eq("selected", true), client.from("volunteer_badges").select("*").eq("member_id", id)]);
    const points = (selected || []).reduce((sum, row) => sum + Number(row.points || 0), 0);
    return Response.json({
      points,
      badges: badges || [],
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
  if (action.startsWith("name-") || action.startsWith("fund")) {
    await ensureAnimalCommunityTables(auth.db);
  }
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
