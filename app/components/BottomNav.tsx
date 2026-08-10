"use client";

import { usePathname } from "next/navigation";
import { IconHouseFill,IconHouseLine,IconMagnifyingglassFill,IconMagnifyingglassLine,IconPersonCircleFill,IconPersonCircleLine,IconArticleFill,IconArticleLine } from "@karrotmarket/react-monochrome-icon";

const items=[
  {href:"/",label:"홈",Icon:IconHouseLine,Active:IconHouseFill},
  {href:"/find",label:"친구 찾기",Icon:IconMagnifyingglassLine,Active:IconMagnifyingglassFill},
  {href:"/stories",label:"이야기",Icon:IconArticleLine,Active:IconArticleFill},
  {href:"/mypage",label:"나의 페이지",Icon:IconPersonCircleLine,Active:IconPersonCircleFill},
];

export function BottomNav(){
  const path=usePathname();
  return <nav className="ff-bottom-nav" aria-label="주요 메뉴">{items.map(({href,label,Icon,Active})=>{const active=href==="/"?path===href:path.startsWith(href),Symbol=active?Active:Icon;return <a className="ff-nav-item" data-active={active} aria-current={active?"page":undefined} aria-label={label} href={href} key={href}><Symbol aria-hidden/><span>{label}</span></a>})}</nav>
}
