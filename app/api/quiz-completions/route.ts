import { getChatGPTUser } from "../../chatgpt-auth";
import { getSupabaseServerClient } from "../../../lib/supabase/server";
import { quizCard, completionDate } from "../../../lib/result-card";

const headers = { "cache-control": "private, no-store" };

function displayTitle(quiz: string, ratio: number, title: string) {
  if (quiz === "care-readiness") return title;
  const rank = ratio >= 1 ? "상위 1%" : ratio >= 0.8 ? "상위 10%" : "상위 50%";
  return `${rank} · ${title}`;
}

export async function GET() {
  const user = await getChatGPTUser();
  if (!user) return Response.json({ error: "로그인 후 수료 기록을 확인할 수 있어요." }, { status: 401, headers });
  const { data, error } = await getSupabaseServerClient().from("member_quiz_completions")
    .select("quiz,ratio,title").eq("member_id", user.userId);
  if (error) return Response.json({ error: "수료 기록을 불러오지 못했어요. 다시 확인해 주세요." }, { status: 503, headers });
  const completions = Object.fromEntries((data ?? []).map(row => [row.quiz, displayTitle(row.quiz, row.ratio, row.title)]));
  return Response.json({ completions }, { headers });
}

export async function POST(request: Request) {
  const user = await getChatGPTUser();
  if (!user) return Response.json({ error: "로그인 후 퀴즈를 완료하면 회원정보에 기록이 저장돼요." }, { status: 401, headers });
  const origin = request.headers.get("origin");
  if (origin && origin !== new URL(request.url).origin) return Response.json({ error: "요청 주소를 확인해 주세요." }, { status: 403, headers });
  let body;
  try { body = await request.json(); } catch { return Response.json({ error: "퀴즈 결과를 확인해 주세요." }, { status: 400, headers }); }
  let result, completedAt;
  try { result = quizCard(body ?? {}, user.displayName); completedAt = completionDate(body?.completedAt); }
  catch { return Response.json({ error: "퀴즈 결과를 확인해 주세요." }, { status: 400, headers }); }
  // 표시용 기록이며 입양 자격이나 회원 권한에 사용하지 않습니다.
  const { ratio, title, medal, card } = result;
  const { data: updated, error } = await getSupabaseServerClient().rpc("save_best_quiz_card", {
    p_member_id: user.userId, p_quiz: card.quiz, p_ratio: ratio, p_title: title,
    p_medal: medal, p_card: card, p_completed_at: completedAt,
  });
  if (error) return Response.json({ error: "수료 기록을 저장하지 못했어요. 다시 저장해 주세요." }, { status: 503, headers });
  return Response.json({ title: displayTitle(card.quiz, ratio, title), updated }, { headers });
}
