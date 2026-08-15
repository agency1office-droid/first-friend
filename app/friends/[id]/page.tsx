import { getAnimalById } from "../../../lib/public-data";
import type { Animal } from "../../../lib/data";
import { getAnimalPublicStatus, getNoticeDaysRemaining } from "../../../lib/animal-public-status";
import type { ComponentType, SVGProps } from "react";
import { Callout } from "seed-design/ui/callout";
import {
  IconCalendarLine,
  IconCheckmarkCircleFill,
  IconCheckmarkScaleLine,
  IconDocumentLine,
  IconHospitalcrossBuildingLine,
  IconLocationpinLine,
  IconMapLocationpinLine,
  IconPawprintLine,
  IconTagLine,
} from "@karrotmarket/react-monochrome-icon";
import { AnimalGallery } from "../../components/AnimalGallery";
import { AnimalActions } from "../../components/AnimalActions";
import { InfoBoard } from "../../components/InfoBoard";
import { LifetimeCarePlanner } from "../../components/LifetimeCarePlanner";
import { NameSuggestionBox } from "../../components/NameSuggestionBox";
import { AnimalFundraiserPanel } from "../../components/AnimalFundraiserPanel";
import { DeferredSection } from "../../components/DeferredSection";
import { ShelterLocationCard } from "../../components/ShelterLocationCard";
import { ShelterTravelMeta } from "../../components/ShelterTravelMeta";
import { ShelterPhoneDialog } from "../../components/ShelterPhoneDialog";
import { AnimalDetailChromeBridge } from "../../components/AnimalDetailChromeBridge";
import { AnimalPublicStatusBanner } from "../../components/AnimalPublicStatusBanner";

// 공개 동물 정보는 초 단위로 바뀌지 않으므로 반복 방문은 짧게 캐시합니다.
// 즐겨찾기 등 사용자 상태는 기존 클라이언트 브리지에서 별도로 처리합니다.
export const revalidate = 60;

const ageLabels: Record<Animal["ageGroup"], string> = {
  "어린 친구": "아기",
  "청년 친구": "성장기",
  "어른 친구": "어른",
  "나이 많은 친구": "노령",
  "나이 미상": "확인 필요",
};

const colorGroups = [
  ["흰색", ["흰", "백색", "화이트", "아이보리"]],
  ["검정", ["검정", "검은", "검", "흑색", "블랙"]],
  ["갈색", ["갈색", "갈", "밤색", "브라운", "초콜릿"]],
  ["황색", ["황색", "황토", "노랑", "옐로우", "크림", "금색"]],
  ["회색", ["회색", "회", "그레이", "잿빛", "은색", "실버"]],
  ["삼색", ["삼색", "세가지색", "칼리코", "캘리코"]],
  ["고등어", ["고등어", "태비", "줄무늬", "호랑이무늬"]],
  ["치즈", ["치즈"]],
] as const;

function detailColors(colors: string[]) {
  const source = colors.join(" ").toLocaleLowerCase("ko-KR");
  const grouped = colorGroups.filter(([, aliases]) => aliases.some(alias => source.includes(alias))).map(([label]) => label);
  return grouped.length ? grouped : colors.filter(Boolean);
}

function detailWeight(animal: Animal) {
  const text = [...animal.traits, ...animal.health].find(value => /\d+(?:\.\d+)?\s*\(?kg\)?/i.test(value));
  const match = text?.match(/(\d+(?:\.\d+)?)\s*\(?kg\)?/i);
  return match ? Number(match[1]) : undefined;
}

function detailSize(animal: Animal) {
  const weight = detailWeight(animal);
  if (weight === undefined) return "확인 필요";
  if (/고양이/.test(animal.species)) return weight < 3 ? "소형" : weight < 6 ? "중형" : weight < 10 ? "대형" : "초대형";
  return weight < 5 ? "소형" : weight < 15 ? "중형" : weight < 30 ? "대형" : "초대형";
}

function detailNeutered(animal: Animal) {
  const value = animal.health.find(item => item.includes("중성화"));
  if (!value) return "확인 필요";
  if (value.includes("완료")) return "중성화 완료";
  if (value.includes("않은") || value.includes("안 됨")) return "중성화 안 됨";
  return "확인 필요";
}

function isDuplicateTrait(trait: string, animal: Animal, colors: string[], publicState: string) {
  const normalizedTrait = trait.replace(/[\s()]/g, "").toLocaleLowerCase("ko-KR");
  if (/\d+(?:\.\d+)?kg/i.test(normalizedTrait) || normalizedTrait.includes("보호중")) return true;
  return [...animal.colors, ...colors, publicState].some((value) => {
    const normalizedValue = value.replace(/[\s()]/g, "").toLocaleLowerCase("ko-KR");
    return normalizedValue.length > 1 && (normalizedTrait.includes(normalizedValue) || normalizedValue.includes(normalizedTrait));
  });
}

function DetailInfoRow({ icon: Icon, label, value }: { icon: ComponentType<SVGProps<SVGSVGElement>>; label: string; value: string }) {
  return <div className="ff-detail-info-row">
    <Icon className="ff-detail-info-icon" aria-hidden />
    <span>{label}</span>
    <strong data-muted={value === "확인 필요" || undefined}>{value}</strong>
  </div>;
}

export default async function AnimalPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const animal = await getAnimalById(id);
  if (!animal) return <div className="ff-page">
    <Callout
      tone="warning"
      title="친구 정보를 불러오지 못했어요"
      description="공고가 종료되었거나 아직 최신 데이터로 동기화되지 않았을 수 있어요. 목록에서 다른 친구를 다시 살펴봐 주세요."
      linkProps={{ href: "/", children: "홈으로 돌아가기" }}
    />
  </div>;
  const publicStatus = getAnimalPublicStatus(animal);
  const noticeDaysRemaining = getNoticeDaysRemaining(publicStatus.notice);
  const colors = detailColors(animal.colors);
  const shelterAddress = animal.shelterAddress || animal.region;
  const shelterHref = animal.shelterId ? `/shelters/${encodeURIComponent(animal.shelterId)}` : null;
  const shelterMapHref = `https://map.kakao.com/link/search/${encodeURIComponent(`${animal.shelter} ${shelterAddress}`)}`;
  const weight = detailWeight(animal);
  const foundArea = animal.life.find((item) => item.startsWith("발견 지역:"))?.replace("발견 지역:", "").trim() || "확인 필요";
  const publicState = publicStatus.publicState || "보호 중";
  const visibleTraits = animal.traits.filter((trait) => !isDuplicateTrait(trait, animal, colors, publicState));
  return (
    <>
      <AnimalDetailChromeBridge />
      <div className="ff-detail-gallery">
        <AnimalGallery
          name={animal.name}
          image={animal.image}
          images={animal.images}
        />
      </div>
      <AnimalPublicStatusBanner
        phase={publicStatus.phase}
        statusLabel={publicStatus.statusLabel}
        detailTitle={publicStatus.detailTitle}
        description={publicStatus.description}
        noticeDaysRemaining={noticeDaysRemaining}
      />
      <section className="ff-detail-shelter" aria-label="보호소 정보">
        <div className="ff-detail-shelter-icon" aria-hidden><IconHospitalcrossBuildingLine /></div>
        {shelterHref ? <a className="ff-detail-shelter-copy ff-detail-shelter-link" href={shelterHref} aria-label={`${animal.shelter} 보호소 페이지 보기`}>
          <strong>{animal.shelter}</strong>
          <p>{shelterAddress}</p>
          <ShelterTravelMeta distance={animal.distanceMeters} lat={animal.shelterLat} lng={animal.shelterLng} />
        </a> : <div className="ff-detail-shelter-copy">
          <strong>{animal.shelter}</strong>
          <p>{shelterAddress}</p>
          <ShelterTravelMeta distance={animal.distanceMeters} lat={animal.shelterLat} lng={animal.shelterLng} />
        </div>}
        <div className="ff-detail-shelter-actions">
          {animal.shelterPhone && <ShelterPhoneDialog shelter={animal.shelter} phone={animal.shelterPhone} />}
          <a className="ff-detail-contact-link" href={shelterMapHref} target="_blank" rel="noreferrer" aria-label={`${animal.shelter} 위치를 카카오맵에서 보기`}>
            <IconMapLocationpinLine aria-hidden />
          </a>
        </div>
      </section>
      <article className="ff-detail-body">
        <h1 className="ff-visually-hidden">{animal.name}</h1>
        <section className="ff-detail-info-section ff-detail-animal-info" aria-labelledby="detail-info-title">
          <h2 id="detail-info-title">동물 친구 정보</h2>
          <div className="ff-detail-info-list">
            <DetailInfoRow icon={IconPawprintLine} label="종류" value={`${animal.species} · ${animal.breed}`} />
            <DetailInfoRow icon={IconCheckmarkScaleLine} label="크기" value={detailSize(animal)} />
            <DetailInfoRow icon={IconCheckmarkScaleLine} label="체중" value={weight === undefined ? "확인 필요" : `${weight}kg`} />
            <DetailInfoRow icon={IconTagLine} label="털색" value={colors.length ? colors.join(" · ") : "확인 필요"} />
            <DetailInfoRow icon={IconCalendarLine} label="나이" value={`${ageLabels[animal.ageGroup]} · ${animal.age}`} />
            <DetailInfoRow icon={IconPawprintLine} label="성별" value={animal.sex || "확인 필요"} />
            <DetailInfoRow icon={IconCheckmarkCircleFill} label="중성화" value={detailNeutered(animal)} />
          </div>
        </section>
        {animal.summary && <section className="ff-detail-memo" aria-label="보호소 메모">
          <div className="ff-detail-memo-heading">
            <IconDocumentLine aria-hidden />
            <strong>보호소 메모</strong>
          </div>
          <p>{animal.summary}</p>
        </section>}
        {visibleTraits.length > 0 && <div className="ff-tags">
          {visibleTraits.map((trait) => (
            <span className="ff-tag" key={trait}>
              {trait}
            </span>
          ))}
        </div>}
        <section className="ff-detail-info-section ff-detail-public-info" aria-label="발견 및 공고 정보">
          <div className="ff-detail-info-list">
            <DetailInfoRow icon={IconCalendarLine} label="공고 기간" value={publicStatus.notice?.replace(/^공고\s*/, "") || "확인 필요"} />
            <DetailInfoRow icon={IconLocationpinLine} label="발견 지역" value={foundArea} />
          </div>
        </section>
        <section className="ff-detail-note" aria-label="확인 안내">
          <IconDocumentLine aria-hidden />
          <p>성격·건강 상태와 정확한 구조 위치는 보호소 상담을 통해 확인해 주세요.</p>
        </section>
        {animal.shelterLat !== undefined && animal.shelterLng !== undefined && <ShelterLocationCard
          jsKey={process.env.NEXT_PUBLIC_KAKAO_JS_KEY || ""}
          name={animal.shelter}
          address={animal.shelterAddress || animal.region}
          phone={animal.shelterPhone}
          lat={animal.shelterLat}
          lng={animal.shelterLng}
          approximate={animal.approximateShelterLocation}
        />}
        <section className="ff-info-block">
          <h2>구조와 보호 정보</h2>
          <p>
            <strong>{animal.shelter}</strong>
            <br />
            {animal.region}
          </p>
          <p className="ff-description">
            정보 갱신 {animal.updated}. 공공데이터에 없는 성격·질병·접종 정보는
            추측하지 않아요.
          </p>
        </section>
        <Callout
          tone="informative"
          title="건강카드는 공개 정보의 요약입니다"
          description="표시되지 않은 검사·접종·치료 여부는 보호처 상담과 실제 만남에서 반드시 다시 확인하세요. 개인 연락처와 정확한 주소는 공개하지 않습니다."
        />
        <DeferredSection>
          <NameSuggestionBox animalId={animal.id} currentName={animal.name} />
        </DeferredSection>
        <DeferredSection>
          <AnimalFundraiserPanel
            animalId={animal.id}
            shelterName={animal.shelter}
          />
        </DeferredSection>
        <section className="ff-info-block">
          <h2>만나기 전 확인할 내용</h2>
          <InfoBoard
            items={[
              {
                id: "health",
                prefix: "Q",
                title: "건강과 생활에서 무엇을 물어보나요?",
                content: (
                  <p>
                    최근 진료 기록, 복용약, 중성화·접종 여부, 먹는 사료, 배변
                    습관, 사람·다른 동물과의 반응을 보호처에 확인하세요.
                  </p>
                ),
              },
              {
                id: "visit",
                prefix: "Q",
                title: "방문과 이동은 어떻게 준비하나요?",
                content: (
                  <p>
                    직접 방문을 우선하고 이동장·인식표를 준비하세요. 장거리라면
                    검증 봉사자 동행 또는 전문 운송과 양측 인계 확인을
                    이용합니다.
                  </p>
                ),
              },
              {
                id: "decision",
                prefix: "Q",
                title: "무엇을 기준으로 결정해야 하나요?",
                content: (
                  <p>
                    사진이나 외형만으로 결정하지 않습니다. 준비도 점수는 참고
                    자료이며 최종 결정은 사람과 동물의 실제 환경을 함께 확인해
                    이루어집니다.
                  </p>
                ),
              },
            ]}
          />
        </section>
        <div className="ff-detail-care-section">
          <LifetimeCarePlanner
            species={animal.species}
            animalAge={Number(animal.age.match(/\d+/)?.[0]) || null}
          />
        </div>
      </article>
      <AnimalActions animalId={animal.id} name={animal.name} shelterPhone={animal.shelterPhone} />
    </>
  );
}
