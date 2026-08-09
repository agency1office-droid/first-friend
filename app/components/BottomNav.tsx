import { IconHouseLine, IconMagnifyingglassLine, IconPersonCircleLine, IconMegaphoneLine } from "@karrotmarket/react-monochrome-icon";
const items = [{href:"/",label:"홈",Icon:IconHouseLine},{href:"/find",label:"찾기",Icon:IconMagnifyingglassLine},{href:"/lost-found",label:"실종·발견",Icon:IconMegaphoneLine},{href:"/mypage",label:"나의 페이지",Icon:IconPersonCircleLine}];
export function BottomNav(){return <nav className="ff-bottom-nav" aria-label="주요 메뉴">{items.map(({href,label,Icon})=><a className="ff-nav-item" href={href} key={href}><Icon/><span>{label}</span></a>)}</nav>}
