/* eslint-disable @next/next/no-html-link-for-pages */
import { getAnimals } from "../lib/public-data";
import { getStories } from "../lib/stories";
import { AnimalCard } from "./components/AnimalCard";
import { StoryCard } from "./components/StoryCard";
import { ActionButton } from "seed-design/ui/action-button";
import { PrefixIcon, SuffixIcon } from "@seed-design/react";
import { IconArticleLine, IconCameraLine, IconCheckmarkShieldLine, IconChevronRightLine, IconHospitalcrossBuildingLine, IconHousePlusLine, IconMagnifyingglassLine, IconMagnifyingglassSparkleLine, IconPawprintLine } from "@karrotmarket/react-monochrome-icon";

export const dynamic = "force-dynamic";

export default async function Home() {
  const [animals, stories] = await Promise.all([getAnimals(6), getStories()]);
  return <>
    <section className="ff-hero">
      <div className="ff-hero-badge"><IconMagnifyingglassSparkleLine/>그림으로 만나는 첫 친구</div>
      <h1>마음속 친구를<br/>그려보세요</h1>
      <p>국가동물보호정보시스템의 실제 보호동물 중 당신의 그림과 닮은 친구를 찾아요.</p>
      <div className="ff-hero-actions">
        <ActionButton asChild size="large"><a href="/find?mode=draw"><PrefixIcon svg={<IconCameraLine/>}/>그려서 찾기</a></ActionButton>
        <ActionButton asChild size="large" variant="neutralWeak"><a href="/find">친구 둘러보기<SuffixIcon svg={<IconChevronRightLine/>}/></a></ActionButton>
      </div>
    </section>
    <section className="ff-promise">
      <div className="ff-promise-item"><span className="ff-promise-icon"><IconPawprintLine/></span>전국 보호동물</div>
      <div className="ff-promise-item"><span className="ff-promise-icon"><IconCheckmarkShieldLine/></span>안전한 입양 절차</div>
      <div className="ff-promise-item"><span className="ff-promise-icon"><IconMagnifyingglassSparkleLine/></span>설명 가능한 매칭</div>
    </section>
    <div className="ff-page">
      <section>
        <div className="ff-section-head"><h2 className="ff-section-title">오늘 등록된 보호동물</h2><a className="ff-more" href="/find">전체보기</a></div>
        <div className="ff-animal-grid">{animals.map((animal) => <AnimalCard animal={animal} key={animal.id}/>)}</div>
      </section>
      <div className="ff-divider"/>
      <section className="ff-section"><div className="ff-section-head"><h2 className="ff-section-title">많이 응원받은 이야기</h2><a className="ff-more" href="/stories">전체보기</a></div><div className="ff-popular-scroll">{[...stories].sort((a,b)=>b.reactions-a.reactions).slice(0,5).map((story)=><a className="ff-popular-card" href={`/stories/${story.id}`} key={story.id} style={{backgroundImage:`linear-gradient(180deg, transparent 20%, rgba(0,0,0,.76)), url(${story.image})`}}><span>{story.category}</span><strong>{story.title}</strong><small>응원 {story.reactions}</small></a>)}</div></section>
      <section className="ff-section"><div className="ff-section-head"><h2 className="ff-section-title">새로운 이야기</h2><a className="ff-more" href="/stories">전체보기</a></div><div className="ff-story-list">{stories.slice(0,3).map((story)=><StoryCard story={story} key={story.id}/>)}</div></section>
      <section className="ff-section"><ActionButton asChild size="large" variant="neutralSolid" className="ff-action-link"><a href="/readiness">입양 준비도 알아보기<SuffixIcon svg={<IconChevronRightLine/>}/></a></ActionButton></section>
      <section className="ff-section"><div className="ff-section-head"><h2 className="ff-section-title">필요한 순간 바로 찾기</h2><a className="ff-more" href="/guide">전체 입양 안내</a></div><div className="ff-service-grid"><a href="/lost-found"><IconMagnifyingglassLine/><strong>실종·발견</strong><span>신고·알림·QR 전단지</span></a><a href="/shelters"><IconHospitalcrossBuildingLine/><strong>보호센터</strong><span>전국 운영 정보</span></a><a href="/foster"><IconHousePlusLine/><strong>임시보호 등록</strong><span>교육 후 직접 등록</span></a><a href="/stories/new"><IconArticleLine/><strong>이야기 쓰기</strong><span>연락처 없이 안전하게</span></a></div></section>
    </div>
  </>;
}
