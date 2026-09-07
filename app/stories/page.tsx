import Link from "next/link";
import type { Metadata } from 'next';
import { getStoryPage } from '../../lib/stories';
import { storyCategories } from '../../lib/story-input';
import { StoryFeed } from '../components/StoryFeed';
import { ActionButton } from 'seed-design/ui/action-button';
import { Callout } from 'seed-design/ui/callout';
import './board.css';
export const dynamic='force-dynamic';
export const metadata:Metadata={title:'이야기'};
export default async function StoriesPage({searchParams}:{searchParams:Promise<Record<string,string|string[]|undefined>>}){
 const values=await searchParams,params=new URLSearchParams();
 for(const [k,v] of Object.entries(values))if(typeof v==='string')params.set(k,v);
 let result,error='';try{result=await getStoryPage(params);}catch{error='이야기를 불러오지 못했어요. 잠시 후 다시 확인해 주세요.';}
 function href(change:Record<string,string>){const next=new URLSearchParams(params);for(const [k,v] of Object.entries(change)){if(v)next.set(k,v);else next.delete(k);}return '/stories?'+next;}
 return <div className="ff-page ff-board-page">
  <header className="ff-board-heading"><div><h1>이야기</h1><p>함께하는 일상, 가볍게 나눠요.</p></div><ActionButton asChild size="small"><Link href="/stories/new">글쓰기</Link></ActionButton></header>
  <div className="ff-board-intro"><span>댓글과 별점 대신 공감과 응원을 나눠요.</span><Link href="/stories/manage">내 글 관리</Link></div>
  <nav className="ff-board-tabs" aria-label="이야기 종류">{[['','전체'],...Object.entries(storyCategories)].map(([k,label])=><Link key={k} href={href({category:k,page:''})} aria-current={(params.get('category')||'')===k?'page':undefined}>{label}</Link>)}</nav>
  <form action="/stories" className="ff-board-search"><input name="q" aria-label="이야기 제목 검색" placeholder="어떤 이야기를 찾으세요?" defaultValue={params.get('q')||''} maxLength={80}/>{['category','author'].map(k=>params.get(k)&&<input type="hidden" name={k} value={params.get(k)!} key={k}/>)}<select name="sort" aria-label="정렬" defaultValue={params.get('sort')||'newest'}><option value="newest">최신순</option><option value="cheers">응원순</option></select><ActionButton size="small" type="submit" variant="neutralWeak">검색</ActionButton></form>
  {params.get('author')&&<div className="ff-board-author-filter">{result?.stories[0]?.author||'선택한 회원'}의 이야기 <Link href={href({author:'',page:''})}>전체 회원 보기</Link></div>}
  {error?<Callout tone="critical" description={error}/>:<><div className="ff-board-total">전체 {result!.total}개</div><StoryFeed stories={result!.stories}/><nav className="ff-board-pagination" aria-label="이야기 페이지">{result!.page>1&&<Link href={href({page:String(result!.page-1)})}>이전</Link>}<span>{result!.page} / {Math.max(1,Math.ceil(result!.total/result!.pageSize))}</span>{result!.page*result!.pageSize<result!.total&&<Link href={href({page:String(result!.page+1)})}>다음</Link>}</nav></>}
 </div>;
}
