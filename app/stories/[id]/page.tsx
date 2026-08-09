/* eslint-disable @next/next/no-img-element */
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getStories } from "../../../lib/stories";
import { StoryActions } from "../../components/StoryActions";
import { Callout } from "seed-design/ui/callout";

export const dynamic = "force-dynamic";
export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> { const { id } = await params; const story = (await getStories()).find((item) => item.id === id); return story ? { title: story.title, description: story.body.slice(0, 140), openGraph: { title: story.title, description: story.body.slice(0, 140), images: [story.image] } } : {}; }
export default async function StoryPage({ params }: { params: Promise<{ id: string }> }) { const { id } = await params; const story = (await getStories()).find((item) => item.id === id); if (!story) notFound(); return <article><img className="ff-story-hero" src={story.image} alt=""/><div className="ff-detail-body"><div className="ff-kicker">{story.category}</div><h1 className="ff-title">{story.title}</h1><div className="ff-story-byline">{story.author} · 전체 공개</div><div className="ff-story-content">{story.body.split("\n").map((paragraph) => <p key={paragraph}>{paragraph}</p>)}</div><StoryActions postId={story.postId} initialCount={story.reactions}/><section className="ff-section"><Callout tone="neutral" description="입양 후 이야기는 자발적 기록입니다. 정확한 동물 위치·급식 장소·개인 연락처를 발견하면 신고해 주세요."/></section></div></article>; }
