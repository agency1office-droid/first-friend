"use client";
import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import type { PublicStory } from '../../lib/stories';
import { StoryCard } from './StoryCard';
type Page={stories:PublicStory[];total:number;page:number;pageSize:number};
// 서버가 그린 첫 페이지 뒤로는 화면 끝에 닿을 때마다 /api/posts 다음 페이지를 이어 붙인다.
export function StoryFeed({initial,query}:{initial:Page;query:string}){
 const [items,setItems]=useState(initial.stories),[page,setPage]=useState(initial.page),[total,setTotal]=useState(initial.total),[loading,setLoading]=useState(false),[error,setError]=useState("");
 const sentinel=useRef<HTMLDivElement>(null),lock=useRef(false);
 const hasMore=page*initial.pageSize<total;
 const loadMore=useCallback(async()=>{
  if(lock.current)return;lock.current=true;setLoading(true);setError("");
  try{
   const params=new URLSearchParams(query);params.set("page",String(page+1));
   const r=await fetch("/api/posts?"+params);const body=await r.json();if(!r.ok)throw new Error(body.error);
   // 새 글이 올라와 페이지가 밀려도 같은 글이 두 번 보이지 않게 한다.
   setItems(current=>{const seen=new Set(current.map(s=>s.id));return [...current,...(body.stories as PublicStory[]).filter(s=>!seen.has(s.id))];});
   setPage(body.page);setTotal(body.total);
  }catch{setError("이야기를 더 불러오지 못했어요.");}
  finally{lock.current=false;setLoading(false);}
 },[query,page]);
 useEffect(()=>{
  const node=sentinel.current;if(!node||!hasMore||error)return;
  const observer=new IntersectionObserver(entries=>{if(entries[0]?.isIntersecting)void loadMore();},{rootMargin:"500px 0px"});
  observer.observe(node);return()=>observer.disconnect();
 },[hasMore,error,loadMore]);
 return <div className="ff-board-list">
  {items.length?items.map(story=><StoryCard story={story} key={story.id}/>):<div className="ff-board-empty"><strong>아직 이야기가 없어요</strong><p>함께한 순간을 첫 이야기로 남겨 주세요.</p><Link href="/stories/new">이야기 쓰기 →</Link></div>}
  {loading&&<p className="ff-board-muted ff-board-feed-status" aria-live="polite">이야기를 더 불러오는 중이에요</p>}
  {error&&<div className="ff-feed-error" role="alert"><span>{error}</span><button type="button" onClick={()=>void loadMore()}>다시 불러오기</button></div>}
  {hasMore&&<div className="ff-feed-sentinel" ref={sentinel} aria-hidden="true"/>}
  {!hasMore&&items.length>0&&<p className="ff-board-muted ff-board-feed-status">모든 이야기를 봤어요</p>}
 </div>;
}
