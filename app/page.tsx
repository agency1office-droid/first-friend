import { AnimalCard } from "./components/AnimalCard";
import { StoryCard } from "./components/StoryCard";
import { animals, stories } from "../lib/data";

export default function Home() {
  return <>
    <section className="hero">
      <div className="hero-copy"><div className="eyebrow">Draw your first friend</div><h1>마음속 친구를<br />그려보세요.</h1><p>당신의 그림과 닮은 보호동물을 찾아, 안전한 만남과 평생의 가족이 되는 길을 함께합니다.</p></div>
      <div className="hero-actions"><a className="primary-button" href="/find?mode=draw">✎ 그려서 찾기</a><a className="secondary-button" href="/find">친구 둘러보기</a></div>
      <div className="hero-doodle" aria-hidden="true"><span className="doodle-paw one">●</span><span className="doodle-paw two">●</span><span className="doodle-paw three">●</span><span className="doodle-line" /></div>
    </section>
    <div className="promise-strip"><div className="promise"><span>⌁</span>전국 보호동물</div><div className="promise"><span>♡</span>생명을 평가하지 않아요</div><div className="promise"><span>⌂</span>안전한 입양 절차</div></div>
    <div className="page">
      <section className="section"><div className="section-head"><h2 className="section-title">지금 가족을 기다려요</h2><a className="text-link" href="/find">모두 보기 →</a></div><div className="animal-grid">{animals.slice(0,4).map((animal) => <AnimalCard animal={animal} key={animal.id} />)}</div></section>
      <section className="section"><div className="section-head"><h2 className="section-title">우리의 요즘 이야기</h2><a className="text-link" href="/stories">이야기 더보기 →</a></div><div className="story-scroller">{stories.map((story) => <StoryCard story={story} key={story.id} />)}</div></section>
      <section className="section info-card"><span className="eyebrow">Before adoption</span><h2>좋아하는 마음 다음의 준비</h2><p className="page-subtitle">주거·시간·비용을 평가하기보다, 특정 친구와 함께 살기 위해 무엇을 준비하면 좋을지 알려드려요.</p><a className="primary-button" href="/readiness">입양 준비도 알아보기</a></section>
    </div>
  </>;
}
