"use client";

import { useEffect, useRef } from "react";
import { usePathname } from "next/navigation";
import { IconChevronLeftLine } from "@karrotmarket/react-monochrome-icon";
import { BottomNav } from "./BottomNav";
import { HomeTopbar } from "./HomeTopbar";
import { NotificationBell } from "./NotificationBell";
import { GlobalMenuButton } from "./GlobalMenuButton";

type RouteChrome={rule:RegExp;title:string;topbarTitle?:string;back?:string;mode?:"detail"|"form"|"main"|"stack"};
const routes:RouteChrome[]=[
  {rule:/^\/participate\/?$/,title:"함께하기",mode:"main"},
  {rule:/^\/mypage\/favorites\/?$/,title:"관심 친구",mode:"main"},
  {rule:/^\/friends\//,title:"친구 정보",topbarTitle:"",back:"/find",mode:"detail"},
  {rule:/^\/apply\//,title:"입양 신청",back:"/find",mode:"form"},
  {rule:/^\/applications\//,title:"입양 진행",back:"/mypage",mode:"detail"},
  {rule:/^\/family\//,title:"가족과 상의하기",back:"/find",mode:"detail"},
  {rule:/^\/find\/worldcup/,title:"이상형 월드컵",back:"/find"},
  {rule:/^\/find\/(draw|photo|conditions)/,title:"특별한 방법으로 찾기",back:"/find"},
  {rule:/^\/drawings/,title:"그림 탐정단",back:"/find"},
  {rule:/^\/questions/,title:"질문답변",back:"/"},
  {rule:/^\/lost-found\/animals\//,title:"실종 동물 상세",back:"/lost-found/animals",mode:"detail"},
  {rule:/^\/lost-found\/animals\/?$/,title:"실종 동물",back:"/lost-found",mode:"main"},
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
  {rule:/^\/quiz\/adoption-prep/,title:"입양 준비도",back:"/guide"},
  {rule:/^\/readiness/,title:"입양 준비도",back:"/guide"},
  {rule:/^\/prepare/,title:"입양 전 준비",back:"/guide"},
  {rule:/^\/encyclopedia/,title:"함께살이 백과",back:"/guide"},
  {rule:/^\/lost-found\//,title:"실종·발견 상세",back:"/lost-found",mode:"detail"},
  {rule:/^\/lost-found/,title:"실종·발견",back:"/"},
  {rule:/^\/tnr/,title:"TNR·도움 연결",back:"/"},
  {rule:/^\/support/,title:"후원·제휴",back:"/"},
  {rule:/^\/about/,title:"퍼스트 프렌드의 약속",back:"/"},
  {rule:/^\/(terms|privacy)/,title:"이용 안내",back:"/"},
  {rule:/^\/notifications/,title:"알림",back:"/"},
  {rule:/^\/guide/,title:"입양 절차 안내",back:"/"},
  {rule:/^\/shelters/,title:"보호소",mode:"main"},
  {rule:/^\/stories/,title:"이야기",mode:"main"},
  {rule:/^\/find/,title:"친구 찾기",mode:"main"},
  {rule:/^\/mypage/,title:"나의 페이지",mode:"main"},
];

const historyKey="ff-app-navigation-history";
function readHistory(){try{const value=JSON.parse(window.sessionStorage.getItem(historyKey)||"[]");return Array.isArray(value)?value.filter(item=>typeof item==="string").slice(-30):[]}catch{return[]}}
function writeHistory(value:string[]){try{window.sessionStorage.setItem(historyKey,JSON.stringify(value.slice(-30)))}catch{return}}

export function AppBackButton({fallback,title,className}:{fallback:string;title:string;className?:string}){
  const goBack=()=>{
    const current=`${window.location.pathname}${window.location.search}${window.location.hash}`,stack=readHistory();
    const currentIndex=stack.lastIndexOf(current);
    if(currentIndex>=0)stack.splice(currentIndex,1);else if(stack.length)stack.pop();
    const hasAppPrevious=stack.length>0;
    if(hasAppPrevious&&window.history.length>1){writeHistory(stack);window.history.back();return}
    const sameOriginReferrer=Boolean(document.referrer&&new URL(document.referrer).origin===window.location.origin);
    if(sameOriginReferrer&&window.history.length>1){window.history.back();return}
    window.location.assign(fallback);
  };
  return <button className={`ff-app-back${className ? ` ${className}` : ""}`} type="button" onClick={goBack} aria-label={`${title}에서 이전 페이지로 돌아가기`}><IconChevronLeftLine aria-hidden/></button>;
}

function MainTopbar({title}:{title:string}){
  return <header className="ff-topbar ff-main-topbar">
    <strong className="ff-topbar-main-title">{title}</strong>
    <div className="ff-top-actions"><NotificationBell/><GlobalMenuButton/></div>
  </header>;
}

function StackTopbar({route}:{route:RouteChrome}){
  return <header className="ff-topbar ff-stack-topbar">
    <div className="ff-topbar-side">{route.back&&<AppBackButton fallback={route.back} title={route.title}/>}</div>
    <strong className="ff-topbar-title">{route.topbarTitle ?? route.title}</strong>
    <div className="ff-topbar-side ff-topbar-side-end"/>
  </header>;
}

export function AppChrome({children}:{children:React.ReactNode}){
  const path=usePathname(),route=routes.find(item=>item.rule.test(path));
  const initialized=useRef(false);
  useEffect(()=>{
    const current=`${window.location.pathname}${window.location.search}${window.location.hash}`;
    let stack=readHistory();
    if(!initialized.current){
      const navigation=performance.getEntriesByType("navigation")[0] as PerformanceNavigationTiming|undefined;
      const sameOriginReferrer=Boolean(document.referrer&&new URL(document.referrer).origin===window.location.origin);
      if(navigation?.type==="navigate"&&!sameOriginReferrer)stack=[];
      initialized.current=true;
    }
    if(stack.at(-1)!==current){stack.push(current);writeHistory(stack)}
  },[path]);
  if(path==="/find/draw") return <div className="ff-drawing-shell ff-quiz-shell" data-route-path={path}><main className="ff-main" id="main-content" tabIndex={-1}>{children}</main></div>;
  if(path.startsWith("/quiz/")) return <div className="ff-quiz-shell" data-route-path={path}><main className="ff-main" id="main-content" tabIndex={-1}>{children}</main></div>;
  if(path.startsWith("/pet-cost-calculator")) return <div className="ff-cost-shell" data-route-path={path}><main className="ff-main" id="main-content" tabIndex={-1}>{children}</main></div>;
  const hideBottom=route?.mode==="detail"||route?.mode==="form";
  const isAnimalDetail=path.startsWith("/friends/")||path.startsWith("/lost-found/animals/");
  const resolvedRoute=route||{rule:/.*/,title:"퍼스트 프렌드",back:"/",mode:"stack" as const};
  return <div className="ff-shell" data-route-mode={route?.mode||"main"} data-route-path={path}>
    <a className="ff-skip-link" href="#main-content">본문으로 바로가기</a>
    {!isAnimalDetail&&(path==="/"?<HomeTopbar/>:resolvedRoute.mode==="main"?<MainTopbar title={resolvedRoute.title}/>:<StackTopbar route={resolvedRoute}/>)}
    <main className="ff-main" id="main-content" tabIndex={-1}>{children}</main>
    {!hideBottom&&<BottomNav/>}
  </div>
}
