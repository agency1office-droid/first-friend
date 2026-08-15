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
  IconMalesymbolFemalesymbolLine,
  IconMapLocationpinLine,
  IconNeedleScaleLine,
  IconPawprintLine,
  IconTagLine,
} from "@karrotmarket/react-monochrome-icon";
import { AnimalGallery } from "../../components/AnimalGallery";
import { AnimalActions } from "../../components/AnimalActions";
import { InfoBoard } from "../../components/InfoBoard";
import { ShelterLocationCard } from "../../components/ShelterLocationCard";
import { ShelterTravelMeta } from "../../components/ShelterTravelMeta";
import { ShelterPhoneDialog } from "../../components/ShelterPhoneDialog";
import { AnimalDetailChromeBridge } from "../../components/AnimalDetailChromeBridge";
import { AnimalPublicStatusBanner } from "../../components/AnimalPublicStatusBanner";
import { AnimalAiIntro } from "../../components/AnimalAiIntro";

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

function DetailInfoRow({ icon: Icon, label, value, className }: { icon: ComponentType<SVGProps<SVGSVGElement>>; label: string; value: string; className?: string }) {
  return <div className={`ff-detail-info-row${className ? ` ${className}` : ""}`}>
    <div className="ff-detail-info-row-main">
      <Icon className="ff-detail-info-icon" aria-hidden />
      <span>{label}</span>
      <strong data-muted={value === "확인 필요" || undefined}>{value}</strong>
    </div>
  </div>;
}

function animalKnowledge(animal: Animal) {
  const isCat = /고양이/.test(animal.species);
  return {
    species: isCat ? "독립적인 면과 호기심이 함께 있어요. 성격과 생활 습관은 개체마다 달라요." : "사람과 교감하며 생활하는 동물이에요. 품종과 개체에 따라 활동량과 성향이 달라요.",
    size: isCat ? "성묘는 보통 3~5kg 정도예요. 개체에 따라 7kg 이상까지 자랄 수 있어요." : "소형견부터 대형견까지 크기 차이가 커요. 대형견은 30kg 이상까지 자랄 수 있어요.",
    age: isCat ? "평균 12~18년 정도 살고, 20년 이상 사는 경우도 있어요." : "평균 10~13년 정도 살고, 품종과 건강에 따라 15년 이상 사는 경우도 있어요.",
    neutered: "발정 관련 행동과 일부 생식기 질환 위험을 줄이는 데 도움을 줄 수 있어요. 시기와 방법은 수의사와 상담해 주세요.",
  };
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
  const knowledge = animalKnowledge(animal);
  const foundArea = animal.life.find((item) => item.startsWith("발견 지역:"))?.replace("발견 지역:", "").replace(/\s*·\s*정확한 구조 위치 비공개\s*$/, "").trim() || "확인 필요";
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
      <AnimalAiIntro animalId={animal.id} />
      <article className="ff-detail-body">
        <h1 className="ff-visually-hidden">{animal.name}</h1>
        <section className="ff-detail-info-section ff-detail-animal-info" aria-labelledby="detail-info-title">
          <h2 id="detail-info-title">동물 친구 정보</h2>
          <div className="ff-detail-info-list">
            <DetailInfoRow icon={IconCalendarLine} label="공고 기간" value={publicStatus.notice?.replace(/^공고\s*/, "") || "확인 필요"} />
            <DetailInfoRow icon={IconPawprintLine} label="종류" value={`${animal.species} · ${animal.breed}`} />
            <DetailInfoRow icon={IconNeedleScaleLine} label="크기" value={detailSize(animal)} />
            <DetailInfoRow icon={IconCheckmarkScaleLine} label="체중" value={weight === undefined ? "확인 필요" : `${weight}kg`} />
            <DetailInfoRow icon={IconTagLine} label="털색" value={colors.length ? colors.join(" · ") : "확인 필요"} />
            <DetailInfoRow icon={IconCalendarLine} label="나이" value={`${ageLabels[animal.ageGroup]} · ${animal.age}`} />
            <DetailInfoRow icon={IconMalesymbolFemalesymbolLine} label="성별" value={animal.sex || "확인 필요"} />
            <DetailInfoRow icon={IconCheckmarkCircleFill} label="중성화" value={detailNeutered(animal)} />
            <DetailInfoRow icon={IconLocationpinLine} label="발견 지역" value={foundArea} />
          </div>
        </section>
        {animal.summary && <DetailInfoRow icon={IconDocumentLine} label="메모" value={animal.summary} className="ff-detail-info-row--memo" />}
        {visibleTraits.length > 0 && <div className="ff-tags">
          {visibleTraits.map((trait) => (
            <span className="ff-tag" key={trait}>
              {trait}
            </span>
          ))}
        </div>}
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
          <h2>만나기 전 확인할 내용</h2>
          <InfoBoard
            items={[
              {
                id: "species-knowledge",
                prefix: "i",
                title: "이 종류의 성격과 특징은 어떤가요?",
                content: <p>{knowledge.species}</p>,
              },
              {
                id: "size-knowledge",
                prefix: "i",
                title: "얼마나 크게 자라나요?",
                content: <p>{knowledge.size}</p>,
              },
              {
                id: "age-knowledge",
                prefix: "i",
                title: "얼마나 오래 사나요?",
                content: <p>{knowledge.age}</p>,
              },
              {
                id: "neutered-knowledge",
                prefix: "i",
                title: "중성화하면 어떤 점이 있나요?",
                content: <p>{knowledge.neutered}</p>,
              },
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
      </article>
      <AnimalActions animalId={animal.id} name={animal.name} shelterPhone={animal.shelterPhone} />
    </>
  );
}
