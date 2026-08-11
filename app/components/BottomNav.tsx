"use client";

import { usePathname } from "next/navigation";
import { IconHouseFill,IconHouseLine,IconBookmarkFill,IconBookmarkLine,IconPersonCircleFill,IconPersonCircleLine,IconArticleFill,IconArticleLine,IconHandWaveFill,IconHandWaveLine } from "@karrotmarket/react-monochrome-icon";

const items=[
  {href:"/",label:"홈",Icon:IconHouseLine,Active:IconHouseFill},
  {href:"/mypage/favorites",label:"관심 친구",Icon:IconBookmarkLine,Active:IconBookmarkFill},
  {href:"/stories",label:"이야기",Icon:IconArticleLine,Active:IconArticleFill},
  {href:"/participate",label:"함께하기",Icon:IconHandWaveLine,Active:IconHandWaveFill},
  {href:"/mypage",label:"나의 페이지",Icon:IconPersonCircleLine,Active:IconPersonCircleFill},
];

export function BottomNav(){
  const path=usePathname();
  const activeHref=items.filter(({href})=>href==="/"?path===href:path===href||path.startsWith(`${href}/`)).sort((a,b)=>b.href.length-a.href.length)[0]?.href;
  return <nav className="ff-bottom-nav" aria-label="주요 메뉴">{items.map(({href,label,Icon,Active})=>{const active=activeHref===href,Symbol=active?Active:Icon;return <a className="ff-nav-item" data-active={active} aria-current={active?"page":undefined} aria-label={label} href={href} key={href}><Symbol aria-hidden/><span>{label}</span></a>})}</nav>
}
