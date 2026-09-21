import { getChatGPTUser } from "../../chatgpt-auth";
import { getSupabaseServerClient } from "../../../lib/supabase/server";

const headers = { "cache-control": "private, no-store" };
const quizzes = ["care-readiness", "adoption-prep", "pet-knowledge"];
const careTitles = ["함께할 준비가 잘 되어 있어요", "조금 더 확인해 보면 좋아요", "아직 확인할 내용이 있어요", "함께할 준비가 차곡차곡 갖춰졌어요", "함께할 준비를 잘 이어가고 있어요", "함께하기 전, 먼저 확인할 것이 있어요"];

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
  const { quiz, ratio } = body ?? {};
  if (!quizzes.includes(quiz) || typeof ratio !== "number" || !Number.isFinite(ratio) || ratio < 0 || ratio > 1) {
    return Response.json({ error: "퀴즈 결과를 확인해 주세요." }, { status: 400, headers });
  }
  // 표시용 기록이며 입양 자격이나 회원 권한에 사용하지 않습니다.
  let title: string;
  if (quiz === "care-readiness") {
    if (!careTitles.includes(body.title)) return Response.json({ error: "점검 결과를 확인해 주세요." }, { status: 400, headers });
    title = body.title;
  } else {
    const total = quiz === "pet-knowledge" ? 15 : 17;
    const count = Math.round(ratio * total);
    if (Math.abs(ratio * total - count) > 0.000001) return Response.json({ error: "점수를 확인해 주세요." }, { status: 400, headers });
    title = count === total ? (quiz === "pet-knowledge" ? "최고의 반려인" : "완벽한 반려인")
      : ratio < 0.8 ? "배워가는 반려인" : quiz === "adoption-prep" && count === Math.ceil(total * 0.8) ? "따뜻한 반려인" : "세심한 반려인";
  }
  const { error } = await getSupabaseServerClient().from("member_quiz_completions").upsert({
    member_id: user.userId, quiz, ratio, title, completed_at: new Date().toISOString(),
  }, { onConflict: "member_id,quiz" });
  if (error) return Response.json({ error: "수료 기록을 저장하지 못했어요. 다시 저장해 주세요." }, { status: 503, headers });
  return Response.json({ title: displayTitle(quiz, ratio, title) }, { headers });
}
