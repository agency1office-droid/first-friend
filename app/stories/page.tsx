/* eslint-disable @next/next/no-html-link-for-pages */
import type { Metadata } from "next";
import { getStories } from "../../lib/stories";
import { StoryCard } from "../components/StoryCard";
import { ActionButton } from "seed-design/ui/action-button";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "이야기" };

export default async function StoriesPage() {
  const stories = await getStories();
  const popular = [...stories].sort((a, b) => b.reactions - a.reactions).slice(0, 5);
  return <div className="ff-page"><header className="ff-page-header"><div className="ff-kicker">전체 공개 이야기</div><h1 className="ff-title">함께 살아가는<br/>마음의 기록</h1><p className="ff-description">댓글과 별점 대신 조용한 공감과 응원을 나눠요. 입양 후 기록은 의무가 아닙니다.</p></header><section><h2 className="ff-section-title">많이 응원받은 이야기</h2><div className="ff-popular-scroll">{popular.map((story) => <a className="ff-popular-card" href={`/stories/${story.id}`} key={story.id} style={{ backgroundImage: `linear-gradient(180deg, transparent 20%, rgba(0,0,0,.76)), url(${story.image})` }}><span>{story.category}</span><strong>{story.title}</strong><small>응원 {story.reactions}</small></a>)}</div></section><div className="ff-filter-bar">{["전체", "입양 일기", "동네 친구", "오늘의 추억", "보호 이야기"].map((item, index) => <button className="ff-filter-button" data-active={index === 0} key={item}>{item}</button>)}</div><div className="ff-story-list">{stories.map((story) => <StoryCard story={story} key={story.id}/>)}</div><div style={{ marginTop: 24 }}><ActionButton asChild size="large" className="ff-action-link"><a href="/stories/new">나의 이야기 쓰기</a></ActionButton></div></div>;
}
