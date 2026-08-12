import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { Callout } from "seed-design/ui/callout";
import { getLostAnimalById } from "../../../../lib/public-data";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const { id } = await params;
  const animal = await getLostAnimalById(decodeURIComponent(id));
  return { title: animal ? `${animal.breed} 실종 정보` : "실종 동물 상세" };
}

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const animal = await getLostAnimalById(decodeURIComponent(id));
  if (!animal) return <div className="ff-page"><header className="ff-page-header"><div className="ff-kicker">실종 동물 정보</div><h1 className="ff-title">이 정보는<br />더 이상 확인할 수 없어요</h1><p className="ff-description">공공기관의 원본 목록에서 삭제되었거나 등록번호가 변경된 동물일 수 있어요.</p></header><Callout tone="informative" title="목록에서 다시 찾아볼까요?" description="현재 공개된 실종 동물 목록을 확인해 주세요." /><div className="ff-inline-actions" style={{ marginTop: 16 }}><Link className="ff-action-link" href="/lost-found/animals">실종 동물 목록으로</Link><Link className="ff-action-link ff-action-link-secondary" href="/lost-found">실종·발견 제보하기</Link></div></div>;
  return <div className="ff-page">
    <header className="ff-page-header"><div className="ff-kicker">실종 동물 정보</div><h1 className="ff-title">{animal.breed}<br />가족을 기다리고 있어요</h1><p className="ff-description">공공기관에 공개된 실종 동물 정보입니다. 정확한 연락처와 위치는 공개하지 않아요.</p></header>
    <Image className="ff-lost-detail-image" src={animal.image} alt={`${animal.breed} 실종 등록 사진`} width={520} height={360} unoptimized priority />
    <section className="ff-lost-detail-summary"><div><span>종류</span><strong>{animal.species}</strong></div><div><span>성별</span><strong>{animal.sex}</strong></div><div><span>실종 지역</span><strong>{animal.region}</strong></div><div><span>등록일</span><strong>{animal.happenedAt}</strong></div></section>
    <section className="ff-section"><h2 className="ff-section-title">등록 정보</h2><div className="ff-lost-detail-info"><p><strong>발견·실종 장소</strong>{animal.place}</p><p><strong>털색</strong>{animal.color}</p><p><strong>나이</strong>{animal.age}</p><p><strong>특징</strong>{animal.description}</p></div></section>
    <Callout tone="informative" title="도움이 필요하다면" description="직접 연락처를 공개하거나 현장으로 찾아가기보다, 실종·발견 신고 페이지에서 안전하게 제보해 주세요." />
    <div className="ff-inline-actions" style={{ marginTop: 16 }}><Link className="ff-action-link" href="/lost-found">실종·발견 제보하기</Link><Link className="ff-action-link ff-action-link-secondary" href="/lost-found/animals">실종 동물 더 보기</Link></div>
  </div>;
}
