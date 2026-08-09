/* eslint-disable @next/next/no-img-element */
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getAnimalById } from "../../../lib/public-data";
import { ActionButton } from "seed-design/ui/action-button";
import { Badge } from "@seed-design/react";
import { IconCheckmarkCircleFill, IconChevronLeftLine } from "@karrotmarket/react-monochrome-icon";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const { id } = await params;
  const animal = await getAnimalById(id);
  return animal ? { title: `${animal.name} 만나기`, description: animal.summary } : {};
}

export default async function AnimalPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const animal = await getAnimalById(id);
  if (!animal) notFound();
  return <>
    <div style={{ position: "relative" }}>
      <img className="ff-detail-image" src={animal.image} alt={`${animal.name}의 공공데이터 등록 사진`}/>
      <a className="ff-icon-link" style={{ position: "absolute", top: 16, left: 12, background: "var(--seed-color-bg-layer-floating)" }} href="/find" aria-label="뒤로"><IconChevronLeftLine/></a>
    </div>
    <article className="ff-detail-body">
      <div className="ff-detail-top"><div><div className="ff-kicker">{animal.source}</div><h1 className="ff-detail-name">{animal.name}</h1></div><Badge tone="positive" variant="weak">보호 중</Badge></div>
      <p className="ff-description" style={{ marginTop: 8 }}>{animal.summary}</p>
      <div className="ff-info-grid"><div className="ff-info-cell"><strong>{animal.species}</strong>종</div><div className="ff-info-cell"><strong>{animal.age}</strong>나이</div><div className="ff-info-cell"><strong>{animal.sex}</strong>성별</div></div>
      <div className="ff-tags">{animal.traits.map((trait) => <span className="ff-tag" key={trait}>{trait}</span>)}</div>
      <section className="ff-info-block" style={{ marginTop: 20 }}><h2>공개된 기본 정보</h2><ul className="ff-checklist">{animal.health.map((item) => <li key={item}><IconCheckmarkCircleFill className="ff-check"/>{item}</li>)}</ul></section>
      <section className="ff-info-block"><h2>보호 정보를 확인해 주세요</h2><ul className="ff-checklist">{animal.life.map((item) => <li key={item}><IconCheckmarkCircleFill className="ff-check"/>{item}</li>)}</ul></section>
      <section className="ff-info-block"><h2>구조와 보호 정보</h2><p><strong>{animal.shelter}</strong><br/>{animal.region} · {animal.source}</p><p className="ff-description">정보 갱신 {animal.updated}. 공공데이터에 없는 성격·질병·접종 정보는 추측하지 않아요.</p></section>
      <ActionButton asChild size="large" className="ff-action-link"><a href={`/apply/${animal.id}`}>입양 준비 확인하고 신청하기</a></ActionButton>
    </article>
  </>;
}
