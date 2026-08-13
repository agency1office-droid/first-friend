import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { getStoredLostAnimals } from "../../../lib/public-animal-store";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "실종 동물" };

export default async function Page() {
  const animals = await getStoredLostAnimals(24);
  return <div className="ff-page">
    <header className="ff-page-header">
      <div className="ff-kicker">공공 분실동물 정보 연동</div>
      <h1 className="ff-title">가족을 찾고 있는<br />강아지와 고양이</h1>
      <p className="ff-description">공개된 실종동물 정보를 모아 보여드려요. 제보나 신고는 안전한 연결을 위해 별도로 운영합니다.</p>
    </header>
    {animals.length ? <div className="ff-lost-list">{animals.map(animal => <Link className="ff-lost-card" href={`/lost-found/animals/${encodeURIComponent(animal.id)}`} key={animal.id}>
      <Image src={animal.image} alt={`${animal.breed} 실종 등록 사진`} width={112} height={132} unoptimized />
      <div><div className="ff-kicker">{animal.region}</div><h2>{animal.breed} · {animal.sex}</h2><p className="ff-description">{animal.happenedAt}<br />{animal.place}</p><div className="ff-tags"><span className="ff-tag">{animal.color}</span><span className="ff-tag">{animal.age}</span></div></div>
    </Link>)}</div> : <div className="ff-empty">현재 공개된 실종 동물 정보가 없어요.</div>}
    <div className="ff-inline-actions" style={{ marginTop: 20 }}><Link className="ff-action-link" href="/lost-found">실종·발견 신고와 제보</Link></div>
  </div>;
}
