/* eslint-disable @next/next/no-img-element */
import type { Metadata } from "next";
import { getLostAnimals } from "../../lib/public-data";
import { LostFoundForm } from "../components/LostFoundForm";
import { Callout } from "seed-design/ui/callout";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "실종·발견" };

export default async function LostFound() {
  const lostAnimals = await getLostAnimals(12);
  return <div className="ff-page">
    <header className="ff-page-header"><div className="ff-kicker">공공 분실동물 정보 연동</div><h1 className="ff-title">다시 집으로<br/>돌아갈 수 있도록</h1><p className="ff-description">농림축산검역본부 분실동물 정보와 퍼스트 프렌드 제보를 함께 확인해요.</p></header>
    <LostFoundForm/>
    <div className="ff-divider"/>
    <section className="ff-section">
      <div className="ff-section-head"><h2 className="ff-section-title">최근 분실동물</h2><a className="ff-more" href="/shelters">보호센터 찾기</a></div>
      {lostAnimals.length ? <div className="ff-lost-list">{lostAnimals.map((animal) => <article className="ff-lost-card" key={animal.id}>
        <img src={animal.image} alt={`${animal.breed} 분실 등록 사진`} loading="lazy"/>
        <div><div className="ff-kicker">{animal.region}</div><h3>{animal.breed} · {animal.sex}</h3><p className="ff-description">{animal.happenedAt}<br/>{animal.place}</p><div className="ff-tags"><span className="ff-tag">{animal.color}</span><span className="ff-tag">{animal.age}</span></div><p className="ff-lost-mark">{animal.description}</p></div>
      </article>)}</div> : <Callout tone="informative" description="분실동물 정보를 불러오지 못했습니다. 잠시 후 다시 확인해 주세요."/>}
    </section>
  </div>;
}
