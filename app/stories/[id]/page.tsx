/* eslint-disable @next/next/no-img-element */
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getRelatedStories, getStory } from "../../../lib/stories";
import { StoryCard } from "../../components/StoryCard";
import { isStoryReaction, type StoryReaction } from "../../../lib/story-input";
import { getSupabaseServerClient } from "../../../lib/supabase/server";
import { getAuthenticatedMember } from "../../chatgpt-auth";
import { StoryActions } from "../../components/StoryActions";
import { StoryAdminActions } from "../../components/StoryAdminActions";
import { Callout } from "seed-design/ui/callout";
import "../board.css";
export const dynamic="force-dynamic";
export async function generateMetadata({params}:{params:Promise<{id:string}>}):Promise<Metadata>{
 const story=await getStory((await params).id);if(!story)return {title:'이야기를 찾지 못했어요'};
 const description=story.body.replace(/\s+/g,' ').slice(0,140);
 // 카카오톡·SNS에 공유하면 글 제목과 첫 사진이 카드로 보인다. 사진은 공개 글일 때만 API가 내려 준다.
 return {title:story.title,description,openGraph:{title:story.title,description,type:'article',images:story.images.length?[{url:story.images[0]}]:['/og.png']},twitter:{card:story.images.length?'summary_large_image':'summary',title:story.title,description}};
}
export default async function StoryPage({params}:{params:Promise<{id:string}>}){
 // 이 라우트는 loading.tsx를 두지 않는다. 로딩 셸이 먼저 흘러가면 아래 notFound()가 빈 화면(200)이 되고, 셸 없이 던져야 404 페이지로 나간다.
 const story=await getStory((await params).id);if(!story)notFound();
 let related:Awaited<ReturnType<typeof getRelatedStories>>=[];try{related=await getRelatedStories(story);}catch{related=[];}
 const member=await getAuthenticatedMember();let mine:StoryReaction|null=null;
 if(member){const {data}=await getSupabaseServerClient().from("post_reactions").select("reaction").eq("member_id",member.id).eq("post_id",story.postId).maybeSingle();mine=isStoryReaction(data?.reaction)?data.reaction:null;}
 return <article className="ff-page"><Link href="/stories">이야기 목록</Link><div className="ff-kicker">{story.category}</div><h1 className="ff-title">{story.title}</h1><p><Link className="ff-board-author-link" href={"/stories?author="+story.authorId}>{story.author} ›</Link> · {new Date(story.createdAt).toLocaleDateString("ko-KR",{timeZone:"Asia/Seoul"})}</p>{member?.id===story.authorId&&<p><Link href={"/stories/manage/"+story.postId}>내 글 수정</Link></p>}
 {story.images.length>0&&<div className="ff-board-gallery" aria-label="첨부 사진">{story.images.map((src,i)=><figure key={src}><img src={src} alt={"첨부 사진 "+(i+1)} loading={i?"lazy":"eager"}/><figcaption>{i+1} / {story.images.length}</figcaption></figure>)}</div>}
 <div className="ff-board-body">{story.body}</div><StoryActions key={story.postId} postId={story.postId} initialCounts={story.reactionCounts} initialReaction={mine} signedIn={Boolean(member)} returnTo={"/stories/"+story.id}/>{member?.role==="admin"&&<StoryAdminActions postId={story.postId}/>}{related.length>0&&<section className="ff-section"><h2 className="ff-section-title">{story.category}의 다른 이야기</h2><div className="ff-board-list">{related.map(item=><StoryCard story={item} key={item.id}/>)}</div></section>}<section className="ff-section"><Callout tone="neutral" description="정확한 동물 위치·급식 장소·개인 연락처를 발견하면 신고해 주세요."/></section></article>;
}
