import type {Metadata} from "next";
import Link from "next/link";
import {getChatGPTUser} from "../../chatgpt-auth";
import {getStoryPage} from "../../../lib/stories";
import {LoginSheet} from "../../components/LoginSheet";
import {PostManager} from "../../components/PostManager";
import "../board.css";
export const dynamic="force-dynamic";
export const metadata:Metadata={title:"내 이야기 관리",robots:{index:false,follow:false}};
export default async function Page({searchParams}:{searchParams:Promise<Record<string,string|string[]|undefined>>}){
 const user=await getChatGPTUser();
 if(!user)return <div className="ff-page"><h1 className="ff-visually-hidden">내 이야기</h1><LoginSheet returnTo="/stories/manage" prompt="로그인하고 내 이야기를 관리해 보세요" title="퍼스트프렌드 로그인" description="내 글을 보려면 로그인이 필요해요"/></div>;
 const raw=await searchParams,params=new URLSearchParams();for(const [k,v] of Object.entries(raw))if(typeof v==="string")params.set(k,v);
 const result=await getStoryPage(params,user.userId);function pageHref(page:number){const p=new URLSearchParams(params);p.set("page",String(page));return "/stories/manage?"+p;}
 return <div className="ff-page"><header className="ff-page-header"><h1 className="ff-title">내 이야기</h1><p>게시한 글과 임시저장한 글을 관리해요.</p><Link href="/stories/new">글쓰기</Link></header><nav className="ff-board-tabs" aria-label="내 글 상태"><Link href="/stories/manage">전체</Link><Link href="/stories/manage?status=draft">임시저장</Link><Link href="/stories/manage?status=published">게시됨</Link></nav><PostManager initial={result.stories}/><nav className="ff-board-pagination" aria-label="페이지">{result.page>1&&<Link href={pageHref(result.page-1)}>이전</Link>}<span>{result.page}페이지</span>{result.page*result.pageSize<result.total&&<Link href={pageHref(result.page+1)}>다음</Link>}</nav></div>;
}
