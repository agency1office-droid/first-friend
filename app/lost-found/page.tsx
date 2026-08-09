/* eslint-disable @next/next/no-img-element, @next/next/no-html-link-for-pages */
import type { Metadata } from "next";
import { getLostAnimals, getShelters } from "../../lib/public-data";
import { LostFoundForm } from "../components/LostFoundForm";
import { Callout } from "seed-design/ui/callout";
import { List, ListDivider, ListItem } from "seed-design/ui/list";
import { IconHospitalcrossBuildingLine, IconPhoneLine } from "@karrotmarket/react-monochrome-icon";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "실종·발견" };

export default async function LostFound() {
  const [lostAnimals, shelters] = await Promise.all([getLostAnimals(12), getShelters(8)]);
  return <div className="ff-page">
    <header className="ff-page-header"><div className="ff-kicker">공공 분실동물 정보 연동</div><h1 className="ff-title">다시 집으로<br/>돌아갈 수 있도록</h1><p className="ff-description">농림축산검역본부 분실동물 정보와 퍼스트 프렌드 제보를 함께 확인해요.</p></header>
    <LostFoundForm/>
    <div className="ff-divider"/>
    <section className="ff-section">
      <div className="ff-section-head"><h2 className="ff-section-title">최근 분실동물</h2><a className="ff-more" href="#shelters">보호센터 찾기</a></div>
      {lostAnimals.length ? <div className="ff-lost-list">{lostAnimals.map((animal) => <article className="ff-lost-card" key={animal.id}>
        <img src={animal.image} alt={`${animal.breed} 분실 등록 사진`} loading="lazy"/>
        <div><div className="ff-kicker">{animal.region}</div><h3>{animal.breed} · {animal.sex}</h3><p className="ff-description">{animal.happenedAt}<br/>{animal.place}</p><div className="ff-tags"><span className="ff-tag">{animal.color}</span><span className="ff-tag">{animal.age}</span></div><p className="ff-lost-mark">{animal.description}</p></div>
      </article>)}</div> : <Callout tone="informative" description="분실동물 정보를 불러오지 못했습니다. 잠시 후 다시 확인해 주세요."/>}
    </section>
    <section className="ff-section" id="shelters">
      <div className="ff-section-head"><h2 className="ff-section-title">가까운 보호센터</h2><a className="ff-more" href="/shelters">전체보기</a></div>
      {shelters.length ? <List>{shelters.map((shelter, index) => <div key={shelter.id}><ListItem prefix={<IconHospitalcrossBuildingLine/>} title={shelter.name} detail={`${shelter.organization} · ${shelter.animals}\n${shelter.address}\n평일 ${shelter.hours}`} suffix={<a className="ff-shelter-phone" href={`tel:${shelter.phone.replace(/[^\d+]/g, "")}`} aria-label={`${shelter.name} 전화하기`}><IconPhoneLine/></a>}/>{index < shelters.length - 1 && <ListDivider/>}</div>)}</List> : <div className="ff-empty">보호센터 정보를 불러오지 못했어요.</div>}
    </section>
  </div>;
}
