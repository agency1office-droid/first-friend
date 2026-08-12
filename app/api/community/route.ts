import { getChatGPTUser } from "../../chatgpt-auth";
import { getSupabaseServerClient } from "../../../lib/supabase/server";
import { clean } from "../_helpers";

type Row = Record<string, unknown>;
const mapDrawing = (row: Row) => ({ ...row, memberId: row.member_id, imageKey: row.image_key, tagsJson: row.tags_json, createdAt: row.created_at });
const mapMatch = (row: Row) => ({ ...row, postId: row.post_id, memberId: row.member_id, animalId: row.animal_id, createdAt: row.created_at });

export async function GET(request: Request) {
  const url = new URL(request.url), type = url.searchParams.get("type"), id = clean(url.searchParams.get("id"), 120), client = getSupabaseServerClient();
  if (type === "drawings") {
    const { data: posts } = await client.from("drawing_posts").select("*").order("created_at", { ascending: false }).limit(50);
    const { data: matches } = await client.from("drawing_matches").select("*").order("created_at", { ascending: false }).limit(200);
    return Response.json({ posts: (posts || []).map(post => ({ ...mapDrawing(post), matches: (matches || []).filter(match => match.post_id === post.id).map(mapMatch) })) });
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
    return Response.json({ points, badges: badges || [], grade: points >= 1000 ? "퍼스트 프렌드 탐정" : points >= 300 ? "매칭 메이트" : points >= 100 ? "따뜻한 관찰자" : "새싹 친구" });
  }
  return Response.json({ error: "지원하지 않는 목록입니다." }, { status: 400 });
}

export async function POST(request: Request) {
  const user = await getChatGPTUser();
  if (!user) return Response.json({ error: "로그인이 필요합니다." }, { status: 401 });
  const client = getSupabaseServerClient(), { data: member } = await client.from("members").select("role").eq("id", user.userId).maybeSingle();
  if (!member) return Response.json({ error: "회원 정보를 찾을 수 없습니다." }, { status: 404 });
  const data = await request.json() as Record<string, unknown>, action = clean(data.action, 40);
  if (action === "drawing-create") {
    const title = clean(data.title, 100), description = clean(data.description, 500), imageKey = clean(data.imageKey, 300), species = clean(data.species, 10), tags = Array.isArray(data.tags) ? data.tags.map(value => clean(value, 30)).filter(Boolean).slice(0, 12) : [];
    if (!title || !imageKey || !["cat", "dog"].includes(species)) return Response.json({ error: "그림·제목·동물 종류를 확인해 주세요." }, { status: 400 });
    const { data: post, error } = await client.from("drawing_posts").insert({ member_id: user.userId, title, description, image_key: imageKey, species, tags_json: JSON.stringify(tags) }).select("*").single();
    if (error) return Response.json({ error: "그림 게시물을 저장하지 못했어요." }, { status: 500 });
    return Response.json({ post: mapDrawing(post) }, { status: 201 });
  }
  if (action === "drawing-match") {
    const postId = Number(data.postId), animalId = clean(data.animalId, 80), reason = clean(data.reason, 300);
    if (!postId || !animalId || reason.length < 5) return Response.json({ error: "닮은 친구와 이유를 적어주세요." }, { status: 400 });
    const { data: match } = await client.from("drawing_matches").upsert({ post_id: postId, member_id: user.userId, animal_id: animalId, reason }, { onConflict: "post_id,member_id,animal_id", ignoreDuplicates: true }).select("*").maybeSingle();
    return Response.json({ match: match ? mapMatch(match) : null }, { status: 201 });
  }
  if (action === "drawing-select") {
    const id = Number(data.id), { data: match } = await client.from("drawing_matches").select("*").eq("id", id).maybeSingle();
    const { data: post } = match ? await client.from("drawing_posts").select("member_id").eq("id", match.post_id).maybeSingle() : { data: null };
    if (!match || post?.member_id !== user.userId) return Response.json({ error: "게시자만 가장 닮은 답을 선택할 수 있어요." }, { status: 403 });
    await client.from("drawing_matches").update({ selected: true, points: 100 }).eq("id", id);
    await client.from("drawing_posts").update({ status: "matched" }).eq("id", match.post_id);
    return Response.json({ ok: true, points: 100 });
  }
  if (action === "name-suggest") {
    const animalId = clean(data.animalId, 80), name = clean(data.name, 20), reason = clean(data.reason, 200);
    if (!animalId || !name) return Response.json({ error: "이름을 적어주세요." }, { status: 400 });
    const { data: suggestion } = await client.from("animal_name_suggestions").upsert({ animal_id: animalId, member_id: user.userId, name, reason }, { onConflict: "animal_id,member_id,name", ignoreDuplicates: true }).select("*").maybeSingle();
    return Response.json({ suggestion }, { status: 201 });
  }
  if (action === "name-vote") {
    const suggestionId = Number(data.suggestionId);
    const { data: vote } = await client.from("animal_name_votes").upsert({ suggestion_id: suggestionId, member_id: user.userId }, { onConflict: "suggestion_id,member_id", ignoreDuplicates: true }).select("id").maybeSingle();
    if (vote) {
      const { data: suggestion } = await client.from("animal_name_suggestions").select("votes").eq("id", suggestionId).maybeSingle();
      await client.from("animal_name_suggestions").update({ votes: Number(suggestion?.votes || 0) + 1 }).eq("id", suggestionId);
    }
    return Response.json({ voted: Boolean(vote) });
  }
  if (action === "name-select") {
    if (!["shelter", "admin"].includes(String(member.role))) return Response.json({ error: "입점 보호소 담당자만 최종 이름을 채택할 수 있어요." }, { status: 403 });
    const suggestionId = Number(data.suggestionId), { data: suggestion } = await client.from("animal_name_suggestions").select("*").eq("id", suggestionId).maybeSingle();
    if (!suggestion) return Response.json({ error: "이름 제안을 찾을 수 없어요." }, { status: 404 });
    await client.from("animal_name_suggestions").update({ selected: false }).eq("animal_id", suggestion.animal_id);
    const { data: row } = await client.from("animal_name_suggestions").update({ selected: true }).eq("id", suggestionId).select("*").single();
    return Response.json({ suggestion: row });
  }
  if (action === "question-create") {
    const category = clean(data.category, 20), title = clean(data.title, 120), body = clean(data.body, 1500);
    if (!["adoption", "health", "behavior", "care", "shelter"].includes(category) || title.length < 5 || body.length < 20) return Response.json({ error: "질문 제목과 20자 이상의 내용을 확인해 주세요." }, { status: 400 });
    const { data: question, error } = await client.from("community_questions").insert({ member_id: user.userId, category, title, body }).select("*").single();
    if (error) return Response.json({ error: "질문을 저장하지 못했어요." }, { status: 500 });
    return Response.json({ question }, { status: 201 });
  }
  if (action === "answer-create") {
    const questionId = Number(data.questionId), body = clean(data.body, 2000);
    if (!questionId || body.length < 20) return Response.json({ error: "20자 이상의 답변을 적어주세요." }, { status: 400 });
    const { data: answer, error } = await client.from("community_answers").insert({ question_id: questionId, member_id: user.userId, body }).select("*").single();
    if (error) return Response.json({ error: "답변을 저장하지 못했어요." }, { status: 500 });
    await client.from("community_questions").update({ status: "answered" }).eq("id", questionId);
    return Response.json({ answer }, { status: 201 });
  }
  if (action === "fundraiser-create") {
    if (!["shelter", "admin"].includes(String(member.role))) return Response.json({ error: "인증 보호소만 캠페인을 신청할 수 있어요." }, { status: 403 });
    const animalId = clean(data.animalId, 80), title = clean(data.title, 120), purpose = clean(data.purpose, 1000), targetAmount = Math.max(10000, Math.min(100000000, Number(data.targetAmount) || 0));
    const { data: profile } = await client.from("shelter_profiles").select("id").eq("owner_id", user.userId).maybeSingle();
    if (!profile || !animalId || title.length < 5 || purpose.length < 30) return Response.json({ error: "동물·목표금액·치료 또는 지원 근거를 확인해 주세요." }, { status: 400 });
    const { data: fundraiser, error } = await client.from("fundraisers").insert({ shelter_id: profile.id, animal_id: animalId, title, purpose, target_amount: targetAmount, status: "review" }).select("*").single();
    if (error) return Response.json({ error: "후원 캠페인을 저장하지 못했어요." }, { status: 500 });
    return Response.json({ fundraiser }, { status: 201 });
  }
  if (action === "fund-pledge") {
    const fundraiserId = Number(data.fundraiserId), amount = Math.max(1000, Math.min(1000000, Number(data.amount) || 0));
    const { data: campaign } = await client.from("fundraisers").select("status").eq("id", fundraiserId).maybeSingle();
    if (!campaign || campaign.status !== "open") return Response.json({ error: "현재 참여 가능한 검증 캠페인이 아니에요." }, { status: 400 });
    const { data: pledge, error } = await client.from("fundraiser_pledges").insert({ fundraiser_id: fundraiserId, member_id: user.userId, amount, status: "pledged" }).select("*").single();
    if (error) return Response.json({ error: "참여 기록을 저장하지 못했어요." }, { status: 500 });
    return Response.json({ pledge, message: "결제 연동 전 참여 의향으로 기록됐으며 아직 청구되지 않았어요." }, { status: 201 });
  }
  return Response.json({ error: "지원하지 않는 요청입니다." }, { status: 400 });
}
