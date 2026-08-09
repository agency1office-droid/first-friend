import { IconHouseLine, IconMagnifyingglassLine, IconPersonCircleLine, IconArticleLine } from "@karrotmarket/react-monochrome-icon";
const items = [{href:"/",label:"홈",Icon:IconHouseLine},{href:"/find",label:"찾기",Icon:IconMagnifyingglassLine},{href:"/stories",label:"이야기",Icon:IconArticleLine},{href:"/mypage",label:"나의 페이지",Icon:IconPersonCircleLine}];
export function BottomNav(){return <nav className="ff-bottom-nav" aria-label="주요 메뉴">{items.map(({href,label,Icon})=><a className="ff-nav-item" href={href} key={href}><Icon/><span>{label}</span></a>)}</nav>}
