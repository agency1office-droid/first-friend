/* eslint-disable @next/next/no-img-element */
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { animalById, animals } from "../../../lib/data";

export function generateStaticParams() { return animals.map((animal)=>({id: animal.id})); }
export async function generateMetadata({params}:{params:Promise<{id:string}>}): Promise<Metadata> { const {id}=await params; const animal=animalById(id); return animal ? {title:`${animal.name} 만나기`,description:animal.summary} : {}; }
export default async function AnimalPage({params}:{params:Promise<{id:string}>}) {
  const {id}=await params; const animal=animalById(id); if(!animal) notFound();
  return <><div className="detail-hero"><img src={animal.image} alt={`${animal.name}의 대표 사진`} /><a href="/find" className="detail-back">← 돌아가기</a></div><article className="detail-body"><div className="detail-name-row"><div><span className="eyebrow">{animal.source}</span><h1 className="detail-name">{animal.name}</h1></div><span className="source-label">입양 가능</span></div><p className="page-subtitle" style={{marginTop:10}}>{animal.summary}</p><div className="info-grid"><div className="info-cell"><strong>{animal.species}</strong>종</div><div className="info-cell"><strong>{animal.age}</strong>나이</div><div className="info-cell"><strong>{animal.sex}</strong>성별</div></div><div className="tag-row">{animal.traits.map((trait)=><span className="tag" key={trait}>{trait}</span>)}</div><div className="info-card"><h2>건강 카드</h2><ul className="check-list">{animal.health.map((item)=><li key={item}>{item}</li>)}</ul></div><div className="info-card"><h2>함께 살기 전에 알아주세요</h2><ul className="check-list">{animal.life.map((item)=><li key={item}>{item}</li>)}</ul></div><div className="info-card"><h2>구조와 보호 정보</h2><p><strong>{animal.shelter}</strong><br />{animal.region} · {animal.source}</p><p className="page-subtitle" style={{margin:0}}>정보 갱신 {animal.updated}. 정확한 주소와 연락처는 안전한 상담 전까지 공개하지 않습니다.</p></div><div className="notice">건강 정보는 현재 보호자가 확인한 내용이며 진단을 대신하지 않습니다. 최종 입양 승인은 보호소 또는 임시보호자가 상담 후 결정합니다.</div><a className="primary-button" style={{width:"100%"}} href={`/apply/${animal.id}`}>입양 준비 확인하고 신청하기</a></article></>;
}
