/* eslint-disable @next/next/no-html-link-for-pages */
"use client";

import { usePathname } from "next/navigation";
import { IconBellLine, IconChevronLeftLine } from "@karrotmarket/react-monochrome-icon";
import { BottomNav } from "./BottomNav";
import { HomeTopbar } from "./HomeTopbar";

type RouteChrome={rule:RegExp;title:string;back?:string;mode?:"detail"|"form"|"main"};
const routes:RouteChrome[]=[
  {rule:/^\/friends\//,title:"친구 상세",back:"/find",mode:"detail"},
  {rule:/^\/apply\//,title:"입양 신청",back:"/find",mode:"form"},
  {rule:/^\/applications\//,title:"입양 진행",back:"/mypage",mode:"detail"},
  {rule:/^\/family\//,title:"가족과 상의하기",back:"/find",mode:"detail"},
  {rule:/^\/find\/worldcup/,title:"이상형 월드컵",back:"/find"},
  {rule:/^\/find\/(draw|photo|conditions)/,title:"특별한 방법으로 찾기",back:"/find"},
  {rule:/^\/drawings/,title:"그림 탐정단",back:"/find"},
  {rule:/^\/questions/,title:"질문답변",back:"/"},
  {rule:/^\/volunteer/,title:"보호소 봉사",back:"/shelters"},
  {rule:/^\/shelters\/manage/,title:"보호소 비즈니스",back:"/mypage",mode:"form"},
  {rule:/^\/shelters\/map/,title:"주변 보호소",back:"/shelters"},
  {rule:/^\/shelters\//,title:"보호소 채널",back:"/shelters"},
  {rule:/^\/foster\/manage/,title:"임보 관리",back:"/mypage",mode:"form"},
  {rule:/^\/foster/,title:"개인 임보 안내",back:"/"},
  {rule:/^\/stories\/(new|manage)/,title:"이야기 관리",back:"/stories",mode:"form"},
  {rule:/^\/stories\//,title:"이야기",back:"/stories",mode:"detail"},
  {rule:/^\/mypage\//,title:"나의 관리",back:"/mypage"},
  {rule:/^\/operations/,title:"운영 콘솔",back:"/mypage",mode:"form"},
  {rule:/^\/verification/,title:"역할 인증",back:"/mypage",mode:"form"},
  {rule:/^\/adoption-verification/,title:"외부 입양 인증",back:"/mypage",mode:"form"},
  {rule:/^\/appeal/,title:"제재 이의제기",back:"/mypage",mode:"form"},
  {rule:/^\/login/,title:"로그인·회원가입",back:"/",mode:"form"},
  {rule:/^\/readiness/,title:"입양 준비도",back:"/guide"},
  {rule:/^\/prepare/,title:"입양 전 준비",back:"/guide"},
  {rule:/^\/encyclopedia/,title:"함께살이 백과",back:"/guide"},
  {rule:/^\/lost-found\//,title:"실종·발견 상세",back:"/lost-found",mode:"detail"},
  {rule:/^\/lost-found/,title:"실종·발견",back:"/"},
  {rule:/^\/tnr/,title:"TNR·도움 연결",back:"/"},
  {rule:/^\/support/,title:"후원·제휴",back:"/"},
  {rule:/^\/about/,title:"퍼스트 프렌드의 약속",back:"/"},
  {rule:/^\/(terms|privacy)/,title:"이용 안내",back:"/"},
  {rule:/^\/shelters/,title:"보호소",mode:"main"},
  {rule:/^\/stories/,title:"이야기",mode:"main"},
  {rule:/^\/find/,title:"친구 찾기",mode:"main"},
  {rule:/^\/mypage/,title:"나의 페이지",mode:"main"},
];

export function AppChrome({children}:{children:React.ReactNode}){
  const path=usePathname(),route=routes.find(item=>item.rule.test(path));
  const hideBottom=route?.mode==="detail"||route?.mode==="form";
  const aboutPage=path==="/about";
  return <div className="ff-shell" data-route-mode={route?.mode||"main"}>
    <a className="ff-skip-link" href="#main-content">본문으로 바로가기</a>
    {path==="/"?<HomeTopbar/>:<header className="ff-topbar">
      {route?.back?<a className="ff-app-back" href={route.back} aria-label={`${route.title}에서 뒤로 가기`}><IconChevronLeftLine aria-hidden/><span>{route.title}</span></a>:<a className="ff-brand" href="/" aria-label="퍼스트 프렌드 홈">{route?.title||"퍼스트 프렌드"}</a>}
      <div className="ff-top-actions">
        {!aboutPage&&<a className="ff-promise-link" href="/about">우리의 약속</a>}
        <a className="ff-icon-link" href="/notifications" aria-label="알림 확인"><IconBellLine aria-hidden/></a>
      </div>
    </header>}
    <main className="ff-main" id="main-content" tabIndex={-1}>{children}</main>
    {!hideBottom&&<BottomNav/>}
  </div>
}
