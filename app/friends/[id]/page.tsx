import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getAnimalById } from "../../../lib/public-data";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "seed-design/ui/accordion";
import { Callout } from "seed-design/ui/callout";
import { Badge } from "@seed-design/react";
import { IconCheckmarkCircleFill, IconChevronLeftLine } from "@karrotmarket/react-monochrome-icon";
import { AnimalGallery } from "../../components/AnimalGallery";
import { AnimalActions } from "../../components/AnimalActions";

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
      <AnimalGallery name={animal.name} image={animal.image} images={animal.images}/>
      <a className="ff-icon-link" style={{ position: "absolute", top: 16, left: 12, background: "var(--seed-color-bg-layer-floating)" }} href="/find" aria-label="뒤로"><IconChevronLeftLine/></a>
    </div>
    <article className="ff-detail-body">
      <div className="ff-detail-top"><div><div className="ff-kicker">{animal.source}</div><h1 className="ff-detail-name">{animal.name}</h1></div><Badge tone="positive" variant="weak">보호 중</Badge></div>
      <p className="ff-description" style={{ marginTop: 8 }}>{animal.summary}</p>
      <div className="ff-info-grid"><div className="ff-info-cell"><strong>{animal.breed}</strong>품종</div><div className="ff-info-cell"><strong>{animal.age}</strong>나이</div><div className="ff-info-cell"><strong>{animal.sex}</strong>성별</div></div>
      <div className="ff-tags">{animal.traits.map((trait) => <span className="ff-tag" key={trait}>{trait}</span>)}</div>
      <section className="ff-info-block" style={{ marginTop: 20 }}><h2>공개된 기본 정보</h2><ul className="ff-checklist">{animal.health.map((item) => <li key={item}><IconCheckmarkCircleFill className="ff-check"/>{item}</li>)}</ul></section>
      <section className="ff-info-block"><h2>보호 정보를 확인해 주세요</h2><ul className="ff-checklist">{animal.life.map((item) => <li key={item}><IconCheckmarkCircleFill className="ff-check"/>{item}</li>)}</ul></section>
      <section className="ff-info-block"><h2>구조와 보호 정보</h2><p><strong>{animal.shelter}</strong><br/>{animal.region} · {animal.source}</p><p className="ff-description">정보 갱신 {animal.updated}. 공공데이터에 없는 성격·질병·접종 정보는 추측하지 않아요.</p></section>
      <Callout tone="informative" title="건강카드는 공개 정보의 요약입니다" description="표시되지 않은 검사·접종·치료 여부는 보호처 상담과 실제 만남에서 반드시 다시 확인하세요. 개인 연락처와 정확한 주소는 공개하지 않습니다."/>
      <section className="ff-info-block"><h2>만나기 전 확인할 내용</h2><Accordion multiple><AccordionItem value="health"><AccordionTrigger title="건강과 생활 질문"/><AccordionContent><p className="ff-description">최근 진료 기록, 복용약, 중성화·접종 여부, 먹는 사료, 배변 습관, 사람·다른 동물과의 반응을 보호처에 확인하세요.</p></AccordionContent></AccordionItem><AccordionItem value="visit"><AccordionTrigger title="방문과 이동 준비"/><AccordionContent><p className="ff-description">직접 방문을 우선하고 이동장·인식표를 준비하세요. 장거리라면 검증 봉사자 동행 또는 전문 운송과 양측 인계 확인을 이용합니다.</p></AccordionContent></AccordionItem><AccordionItem value="decision"><AccordionTrigger title="입양 결정 원칙"/><AccordionContent><p className="ff-description">사진이나 외형만으로 결정하지 않습니다. 준비도 점수는 참고 자료이며 최종 결정은 사람과 동물의 실제 환경을 함께 확인해 이루어집니다.</p></AccordionContent></AccordionItem></Accordion></section>
    </article>
    <AnimalActions animalId={animal.id} name={animal.name}/>
  </>;
}
