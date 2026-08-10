import type { Metadata } from "next";
import { Finder } from "../../components/Finder";
import { getAnimalsWithPhotoCounts } from "../../../lib/public-data";
import { Callout } from "seed-design/ui/callout";
export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "조건으로 친구 찾기" };
export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{ worldcup?: string }>;
}) {
  const animals = await getAnimalsWithPhotoCounts(30),
    { worldcup = "" } = await searchParams;
  return (
    <div className="ff-page">
      <header className="ff-page-header">
        <div className="ff-kicker">MBTI처럼 취향을 발견하는 조건 검색</div>
        <h1 className="ff-title">
          함께 살 모습을
          <br />
          하나씩 골라보세요
        </h1>
        <p className="ff-description">
          품종·털색·나이·성별·지역을 딱딱하게 입력하는 대신, 내 생활과
          마음에 맞는 친구를 찾아가는 과정입니다.
        </p>
      </header>
      {worldcup && (
        <Callout
          tone="positive"
          title="이상형 월드컵 취향을 가져왔어요"
          description={worldcup.split(",").join(" · ")}
        />
      )}
      <section className="ff-trait-guide">
        <h2>말보다 그림으로 먼저 골라요</h2>
        <div className="ff-trait-examples">
          {[
            { e: "🐱", t: "큰 눈 · 짧은 털" },
            { e: "🐈", t: "복슬복슬 · 긴 털" },
            { e: "🐶", t: "작은 체형 · 둥근 귀" },
            { e: "🐕", t: "큰 체형 · 긴 주둥이" },
          ].map((item) => (
            <div key={item.t}>
              <span>{item.e}</span>
              <strong>{item.t}</strong>
            </div>
          ))}
        </div>
      </section>
      <Finder animals={animals} modeOnly="conditions" initialTags={worldcup} />
    </div>
  );
}
