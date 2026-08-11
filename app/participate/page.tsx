import type { Metadata } from "next";
import { IconChevronRightLine, IconGiftLine, IconHandWaveLine, IconTrophyLine } from "@karrotmarket/react-monochrome-icon";

export const metadata: Metadata = { title: "함께하기" };

const items = [
  { href: "/volunteer", icon: <IconHandWaveLine />, title: "봉사 공고", description: "내가 잘하는 일로 보호소와 동물 곁에 힘을 보태요.", status: "모집 중인 공고 보기" },
  { icon: <IconTrophyLine />, title: "공모전", description: "동물과 함께하는 새로운 아이디어와 이야기를 기다려요.", status: "준비 중" },
  { href: "/support", icon: <IconGiftLine />, title: "크라우드펀딩", description: "보호소와 동물에게 필요한 도움을 함께 모아요.", status: "관심 등록·후원 안내" },
];

export default function Page() {
  return <div className="ff-page">
    <header className="ff-page-header">
      <div className="ff-kicker">작은 마음이 모이면</div>
      <h1 className="ff-title">함께하기</h1>
      <p className="ff-description">입양을 기다리는 친구들을 위해 봉사하고, 응원하고, 새로운 기회를 만들어보세요.</p>
    </header>
    <div className="ff-participation-grid">
      {items.map(item => item.href ? <a className="ff-participation-card" href={item.href} key={item.title}>
        <span className="ff-participation-icon">{item.icon}</span><span className="ff-participation-copy"><strong>{item.title}</strong><small>{item.description}</small><em>{item.status}</em></span><IconChevronRightLine />
      </a> : <div className="ff-participation-card ff-participation-card-disabled" key={item.title}>
        <span className="ff-participation-icon">{item.icon}</span><span className="ff-participation-copy"><strong>{item.title}</strong><small>{item.description}</small><em>{item.status}</em></span>
      </div>)}
    </div>
  </div>;
}
