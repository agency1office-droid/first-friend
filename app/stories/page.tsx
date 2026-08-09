/* eslint-disable @next/next/no-html-link-for-pages */
import type { Metadata } from "next";
import { getStories } from "../../lib/stories";
import { StoryFeed } from "../components/StoryFeed";
import { ActionButton } from "seed-design/ui/action-button";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "이야기" };

export default async function StoriesPage() {
  const stories = await getStories();
  const popular = [...stories].sort((a, b) => b.popularity - a.popularity).slice(0, 5);
  return <div className="ff-page"><header className="ff-page-header"><div className="ff-kicker">전체 공개 이야기</div><h1 className="ff-title">함께 살아가는<br/>마음의 기록</h1><p className="ff-description">댓글과 별점 대신 조용한 공감과 응원을 나눠요. 입양 후 기록은 의무가 아닙니다.</p></header><section><h2 className="ff-section-title">많이 응원받은 이야기</h2><div className="ff-popular-scroll">{popular.map((story) => <a className="ff-popular-card" href={`/stories/${story.id}`} key={story.id} style={{ backgroundImage: `linear-gradient(180deg, transparent 20%, rgba(0,0,0,.76)), url(${story.image})` }}><span>{story.category}</span><strong>{story.title}</strong><small>응원 {story.reactions} · 공유 {story.shares}</small></a>)}</div></section><StoryFeed stories={stories}/><div style={{ marginTop: 24 }}><ActionButton asChild size="large" className="ff-action-link"><a href="/stories/new">나의 이야기 쓰기</a></ActionButton></div></div>;
}
