import type { Metadata } from "next";
import Link from "next/link";
import { Callout } from "seed-design/ui/callout";
import {
  IconCalendarLine,
  IconDocumentLine,
  IconArrowUpRightLine,
  IconHospitalcrossBuildingLine,
  IconLocationpinLine,
  IconMalesymbolFemalesymbolLine,
  IconPawprintLine,
  IconTagLine,
} from "@karrotmarket/react-monochrome-icon";
import { getCachedStoredLostAnimalById } from "../../../../lib/public-animal-store";
import { AnimalGallery } from "../../../components/AnimalGallery";
import { LostAnimalActions } from "../../../components/LostAnimalActions";
import { LostAnimalDetailChromeBridge } from "../../../components/LostAnimalDetailChromeBridge";
import { LostLocationCard } from "../../../components/LostLocationCard";
import { AnimalAiIntro } from "../../../components/AnimalAiIntro";
import { InfoBoard } from "../../../components/InfoBoard";
import { ShelterPhoneDialog } from "../../../components/ShelterPhoneDialog";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const { id } = await params;
  const animal = await getCachedStoredLostAnimalById(decodeURIComponent(id));
  return { title: animal ? `${animal.breed} 실종 정보` : "실종 동물 상세" };
}

function InfoRow({ icon: Icon, label, value, className = "" }: { icon: typeof IconPawprintLine; label: string; value: string; className?: string }) {
  return <div className={`ff-detail-info-row ${className}`.trim()}><div className="ff-detail-info-row-main"><Icon className="ff-detail-info-icon" aria-hidden /><span>{label}</span><strong>{value}</strong></div></div>;
}

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const animal = await getCachedStoredLostAnimalById(decodeURIComponent(id));
  if (!animal) return <div className="ff-page"><Callout tone="informative" title="이 정보는 더 이상 확인할 수 없어요" description="공공기관의 원본 목록에서 삭제되었거나 등록번호가 변경된 동물일 수 있어요." /><div className="ff-inline-actions" style={{ marginTop: 16 }}><Link className="ff-action-link" href="/lost-found/animals">실종 동물 목록으로</Link><Link className="ff-action-link ff-action-link-secondary" href="/lost-found">실종·발견 제보하기</Link></div></div>;

  const displayName = animal.rfidCd ? `${animal.breed} · ${animal.rfidCd}` : animal.breed;
  return <>
    <LostAnimalDetailChromeBridge />
    <div className="ff-detail-gallery"><AnimalGallery name={displayName} image={animal.image} /></div>
    <div className="ff-detail-gallery-status ff-public-status-notice ff-lost-status" role="status" aria-label="실종 동물 상태">
      <div className="ff-detail-status-main"><strong>실종 동물</strong></div>
      <details className="ff-detail-status-details">
        <summary>알아보기</summary>
        <div className="ff-detail-status-description">
          <strong>실종 동물 찾는 중</strong>
          <p>공공기관에 등록된 실종 정보예요. 실종일·지역·등록 특징을 확인하고, 발견했다면 신고게시판을 통해 알려주세요.</p>
        </div>
      </details>
    </div>
    <section className="ff-detail-container ff-detail-shelter ff-lost-source" aria-label="공공데이터 출처">
      <div className="ff-detail-shelter-icon" aria-hidden><IconHospitalcrossBuildingLine /></div>
      <div className="ff-detail-shelter-copy">
        <strong>국가동물보호정보시스템</strong>
        <p>실종 동물 공개 정보</p>
      </div>
      <div className="ff-detail-shelter-actions">
        <ShelterPhoneDialog shelter="동물보호 상담센터" phone="1577-0954" ariaLabel="동물보호 상담센터 전화번호 보기" />
        <a className="ff-detail-contact-link" href="https://www.animal.go.kr/front/awtis/loss/findFrm.do?menuNo=1000000054" target="_blank" rel="noreferrer" aria-label="국가동물보호정보시스템 신고 페이지 열기"><IconArrowUpRightLine aria-hidden /></a>
      </div>
    </section>
    <AnimalAiIntro animalId={animal.id} mode="lost" />
    <article className="ff-detail-container ff-detail-body ff-lost-detail-body">
      <div className="ff-detail-animal-info-group">
        <section className="ff-detail-info-section ff-detail-animal-info" aria-labelledby="lost-detail-info-title">
          <h2 id="lost-detail-info-title">동물 친구 정보</h2>
          <div className="ff-detail-info-list">
            <InfoRow icon={IconCalendarLine} label="실종일" value={animal.happenedAt} />
            <InfoRow icon={IconPawprintLine} label="종류" value={`${animal.species} · ${animal.breed}`} />
            <InfoRow icon={IconTagLine} label="털색" value={animal.color} />
            <InfoRow icon={IconCalendarLine} label="나이" value={animal.age} />
            <InfoRow icon={IconMalesymbolFemalesymbolLine} label="성별" value={animal.sex} />
            <InfoRow icon={IconLocationpinLine} label="실종 지역" value={animal.place || animal.address || animal.region} />
            {animal.description && <InfoRow icon={IconDocumentLine} label="메모" value={animal.description} className="ff-detail-info-row--memo" />}
          </div>
          <p className="ff-detail-data-meta">공공데이터 기준 · {animal.updated || "확인 필요"} 확인</p>
        </section>
      </div>
      <LostLocationCard address={animal.address} region={animal.region} jsKey={process.env.NEXT_PUBLIC_KAKAO_JS_KEY || ""} />
      <section className="ff-info-block ff-lost-guidance" aria-labelledby="lost-guidance-title">
        <h2 id="lost-guidance-title">실종 동물 발견 시 대처 요령</h2>
        <InfoBoard
          showPrefix={false}
          items={[
            { id: "safety", title: "먼저 주변과 동물의 안전을 확인하세요", content: <p>차량이 다니거나 위험한 장소라면 무리하게 따라가거나 붙잡지 말고, 안전한 거리에서 모습을 확인하세요.</p> },
            { id: "compare", title: "공개된 정보와 모습을 비교하세요", content: <p><strong className="ff-info-board-emphasis">종류·털색·성별·나이·특징·실종 지역</strong>을 차례로 확인해 같은 친구인지 살펴보세요. 사진만으로 확정하기 어려운 정보는 단정하지 마세요.</p> },
            { id: "report", title: "공식 신고 게시판에 알려주세요", content: <p><strong className="ff-info-board-emphasis">동물보호정보시스템 신고 게시판</strong>에서 발견 장소와 시각, 사진 등 필요한 내용을 입력해 제보하세요.</p> },
            { id: "call", title: "전화로 신고하려면 1577-0954로 연락하세요", content: <p>통화할 때는 동물의 특징과 발견 위치를 설명하고, 긴급하거나 위험한 상황이면 가까운 관할 기관에도 함께 알려주세요.</p> },
          ]}
        />
      </section>
    </article>
    <LostAnimalActions animalId={animal.id} animalName={displayName} />
  </>;
}
