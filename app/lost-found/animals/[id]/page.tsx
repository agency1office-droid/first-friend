import type { Metadata } from "next";
import Link from "next/link";
import { Callout } from "seed-design/ui/callout";
import {
  IconCalendarLine,
  IconLocationpinLine,
  IconMalesymbolFemalesymbolLine,
  IconPawprintLine,
  IconTagLine,
} from "@karrotmarket/react-monochrome-icon";
import { getCachedStoredLostAnimalById } from "../../../../lib/public-animal-store";
import { AnimalGallery } from "../../../components/AnimalGallery";
import { LostAnimalActions } from "../../../components/LostAnimalActions";
import { LostAnimalDetailChromeBridge } from "../../../components/LostAnimalDetailChromeBridge";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const { id } = await params;
  const animal = await getCachedStoredLostAnimalById(decodeURIComponent(id));
  return { title: animal ? `${animal.breed} 실종 정보` : "실종 동물 상세" };
}

function InfoRow({ icon: Icon, label, value }: { icon: typeof IconPawprintLine; label: string; value: string }) {
  return <div className="ff-detail-info-row"><div className="ff-detail-info-row-main"><Icon className="ff-detail-info-icon" aria-hidden /><span>{label}</span><strong>{value}</strong></div></div>;
}

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const animal = await getCachedStoredLostAnimalById(decodeURIComponent(id));
  if (!animal) return <div className="ff-page"><Callout tone="informative" title="이 정보는 더 이상 확인할 수 없어요" description="공공기관의 원본 목록에서 삭제되었거나 등록번호가 변경된 동물일 수 있어요." /><div className="ff-inline-actions" style={{ marginTop: 16 }}><Link className="ff-action-link" href="/lost-found/animals">실종 동물 목록으로</Link><Link className="ff-action-link ff-action-link-secondary" href="/lost-found">실종·발견 제보하기</Link></div></div>;

  const displayName = `${animal.breed} · ${animal.id.slice(-5)}`;
  return <>
    <LostAnimalDetailChromeBridge />
    <div className="ff-detail-gallery"><AnimalGallery name={displayName} image={animal.image} /></div>
    <div className="ff-detail-gallery-status ff-public-status-notice" role="status" aria-label="실종 동물 상태">
      <div className="ff-detail-status-main"><strong>실종 동물 찾는 중</strong></div>
      <span className="ff-detail-status-link">공개 정보</span>
    </div>
    <article className="ff-detail-container ff-detail-body ff-lost-detail-body">
      <div className="ff-detail-animal-info-group">
        <div className="ff-detail-taxonomy"><span>{animal.species}</span><span aria-hidden>›</span><strong>{animal.breed}</strong></div>
        <section className="ff-detail-info-section ff-detail-animal-info" aria-labelledby="lost-detail-info-title">
          <h1 id="lost-detail-info-title" className="ff-detail-name">{displayName}</h1>
          <p className="ff-detail-data-meta">공공기관에 공개된 실종 동물 정보</p>
          <div className="ff-detail-info-list">
            <InfoRow icon={IconCalendarLine} label="실종일" value={animal.happenedAt} />
            <InfoRow icon={IconLocationpinLine} label="실종 지역" value={animal.region} />
            <InfoRow icon={IconTagLine} label="털색" value={animal.color} />
            <InfoRow icon={IconCalendarLine} label="나이" value={animal.age} />
            <InfoRow icon={IconMalesymbolFemalesymbolLine} label="성별" value={animal.sex} />
          </div>
        </section>
        <section className="ff-lost-detail-note" aria-labelledby="lost-detail-note-title"><h2 id="lost-detail-note-title">등록된 특징</h2><p>{animal.description}</p></section>
        <section className="ff-lost-detail-place" aria-labelledby="lost-detail-place-title"><h2 id="lost-detail-place-title">실종 장소</h2><p>{animal.place}</p></section>
      </div>
      <Callout tone="informative" title="도움이 필요하다면" description="직접 연락처를 공개하거나 현장으로 찾아가기보다, 실종·발견 제보를 통해 안전하게 알려 주세요." />
    </article>
    <LostAnimalActions />
  </>;
}
