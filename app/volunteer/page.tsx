import type { Metadata } from "next";
import { getSupabaseServerClient } from "../../lib/supabase/server";
import { Badge } from "seed-design/ui/badge";
export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "보호소 봉사 찾기" };
const labels: Record<string, string> = {
  cleaning: "청소·정리",
  photography: "사진 찍어주기",
  transport: "이동 봉사",
  medical: "수의·의료 지원",
  care: "급여·돌봄",
  event: "행사·현장 지원",
};
export default async function Page() {
  const client = getSupabaseServerClient(), [{ data: posts }, { data: shelters }] = await Promise.all([client.from("volunteer_posts").select("*").eq("status", "open").order("created_at", { ascending: false }).limit(50), client.from("shelter_profiles").select("*")]), map = new Map((shelters || []).map(s => [s.id, s]));
  return (
    <div className="ff-page">
      <header className="ff-page-header">
        <div className="ff-kicker">내가 잘하는 한 가지로</div>
        <h1 className="ff-title">
          보호소 봉사를
          <br />
          유형별로 찾아요
        </h1>
        <p className="ff-description">
          청소, 사진, 이동, 의료, 돌봄을 나눠 모집합니다. 활동 완료 확인을
          받으면 첫 봉사와 유형별 배지가 생겨요.
        </p>
      </header>
      <div className="ff-volunteer-types">
        {Object.entries(labels).map(([key, label]) => (
          <div key={key}>
            <span>
              {key === "cleaning"
                ? "🧹"
                : key === "photography"
                  ? "📷"
                  : key === "transport"
                    ? "🚙"
                    : key === "medical"
                      ? "🩺"
                      : key === "care"
                        ? "🥣"
                        : "🤝"}
            </span>
            <strong>{label}</strong>
          </div>
        ))}
      </div>
      <div className="ff-qa-list">
        {posts.map((post) => (
          <a
            href={`/shelters/${encodeURIComponent(map.get(post.shelter_id)?.public_id || "")}`}
            key={post.id}
          >
            <Badge tone="informative" variant="weak">
              {labels[post.category] || "돌봄"}
            </Badge>
            <h2>{post.title}</h2>
            <p>
              {map.get(post.shelter_id)?.name} · {post.region}
              <br />
              {post.scheduled_at} · 정원 {post.capacity}명
            </p>
          </a>
        ))}
        {!posts.length && (
          <div className="ff-empty">
            현재 공개된 봉사 공고가 없어요. 보호소 채널에서 새 공고가 열리면
            확인할 수 있어요.
          </div>
        )}
      </div>
    </div>
  );
}
