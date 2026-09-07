/* eslint-disable @next/next/no-img-element */
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getStory } from "../../../lib/stories";
import { getSupabaseServerClient } from "../../../lib/supabase/server";
import { getChatGPTUser } from "../../chatgpt-auth";
import { StoryActions } from "../../components/StoryActions";
import { Callout } from "seed-design/ui/callout";
import "../board.css";
export const dynamic="force-dynamic";
export async function generateMetadata({params}:{params:Promise<{id:string}>}):Promise<Metadata>{
 const story=await getStory((await params).id);return story?{title:story.title,description:story.body.slice(0,140)}:{};
}
export default async function StoryPage({params}:{params:Promise<{id:string}>}){
 const story=await getStory((await params).id);if(!story)notFound();
 const user=await getChatGPTUser();let active=false;
 if(user){const {data}=await getSupabaseServerClient().from("post_reactions").select("id").eq("member_id",user.userId).eq("post_id",story.postId).maybeSingle();active=Boolean(data);}
 return <article className="ff-page"><Link href="/stories">이야기 목록</Link><div className="ff-kicker">{story.category}</div><h1 className="ff-title">{story.title}</h1><p><Link href={"/stories?author="+story.authorId}>{story.author}</Link> · {new Date(story.createdAt).toLocaleDateString("ko-KR",{timeZone:"Asia/Seoul"})}</p>{user?.userId===story.authorId&&<p><Link href={"/stories/manage/"+story.postId}>내 글 수정</Link></p>}
 {story.images.length>0&&<div className="ff-board-gallery" aria-label="첨부 사진">{story.images.map((src,i)=><figure key={src}><img src={src} alt={"첨부 사진 "+(i+1)} loading={i?"lazy":"eager"}/><figcaption>{i+1} / {story.images.length}</figcaption></figure>)}</div>}
 <div className="ff-board-body">{story.body}</div><StoryActions postId={story.postId} initialCount={story.reactions} initialActive={active}/><section className="ff-section"><Callout tone="neutral" description="정확한 동물 위치·급식 장소·개인 연락처를 발견하면 신고해 주세요."/></section></article>;
}
