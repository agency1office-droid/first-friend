import { getAnimalById } from "../../../lib/public-data";
import type { Animal } from "../../../lib/data";
import { getAnimalPublicStatus, getNoticeDaysRemaining } from "../../../lib/animal-public-status";
import type { ComponentType, ReactNode, SVGProps } from "react";
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
import { getBreedKnowledge } from "../../../lib/breed-knowledge";
import { AdoptionPlanningCard } from "../../components/AdoptionPlanningCard";

// 공개 동물 정보는 초 단위로 바뀌지 않으므로 반복 방문은 짧게 캐시합니다.
// 즐겨찾기 등 사용자 상태는 기존 클라이언트 브리지에서 별도로 처리합니다.
export const revalidate = 60;

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

function detailAge(animal: Animal) {
  const raw = String(animal.age || "").trim();
  if (!raw || raw === "나이 미상") return { value: "확인 필요" };
  if (raw.includes("60일미만")) return { value: "생후 2개월 미만", actualAge: "0살" };
  const birthYear = raw.match(/((?:19|20)\d{2})\s*(?:\(\s*년생\s*\)|년생)/);
  if (birthYear) {
    const age = Math.max(0, new Date().getFullYear() - Number(birthYear[1]));
    return { value: `${birthYear[1]}년생`, actualAge: `${age}살` };
  }
  const months = raw.match(/(\d+(?:\.\d+)?)\s*개월/);
  if (months) {
    const ageInMonths = Number(months[1]);
    return ageInMonths < 12
      ? { value: `생후 ${Math.floor(ageInMonths)}개월`, actualAge: "0살" }
      : { value: `생후 ${Math.floor(ageInMonths / 12)}년`, actualAge: `${Math.floor(ageInMonths / 12)}살` };
  }
  const years = raw.match(/(\d+(?:\.\d+)?)\s*살/);
  if (years) return { value: `${Math.floor(Number(years[1]))}살` };
  return { value: raw };
}

function displayShelterAddress(address: string) {
  return address.replace(/\s*\[[^\]]+\]\s*$/, "").trim() || address;
}

function isDuplicateTrait(trait: string, animal: Animal, colors: string[], publicState: string) {
  const normalizedTrait = trait.replace(/[\s()]/g, "").toLocaleLowerCase("ko-KR");
  if (/\d+(?:\.\d+)?kg/i.test(normalizedTrait) || normalizedTrait.includes("보호중")) return true;
  return [...animal.colors, ...colors, publicState].some((value) => {
    const normalizedValue = value.replace(/[\s()]/g, "").toLocaleLowerCase("ko-KR");
    return normalizedValue.length > 1 && (normalizedTrait.includes(normalizedValue) || normalizedValue.includes(normalizedTrait));
  });
}

function formatDetailHelper(value: string): ReactNode {
  const sentences = value.split(/(?<=[.!?。！？])\s*/).filter(Boolean);
  if (sentences.length <= 1) return value;
  return <>{sentences.map((sentence, index) => <span key={`${sentence}-${index}`}>{sentence}{index < sentences.length - 1 && <br />}</span>)}</>;
}

function DetailInfoRow({ icon: Icon, label, value, secondaryValue, helper, className }: { icon: ComponentType<SVGProps<SVGSVGElement>>; label: string; value: string; secondaryValue?: string; helper?: string; className?: string }) {
  if (helper) return <details className={`ff-detail-info-row ff-detail-info-row--accordion${className ? ` ${className}` : ""}`}>
    <summary className="ff-detail-info-row-main">
      <Icon className="ff-detail-info-icon" aria-hidden />
      <span>{label}</span>
      <strong data-muted={value === "확인 필요" || undefined}>{value}{secondaryValue && <small className="ff-detail-info-secondary">{secondaryValue}</small>}</strong>
    </summary>
    <div className="ff-detail-info-helper">{formatDetailHelper(helper)}</div>
  </details>;
  return <div className={`ff-detail-info-row${className ? ` ${className}` : ""}`}>
    <div className="ff-detail-info-row-main">
      <Icon className="ff-detail-info-icon" aria-hidden />
      <span>{label}</span>
      <strong data-muted={value === "확인 필요" || undefined}>{value}{secondaryValue && <small className="ff-detail-info-secondary">{secondaryValue}</small>}</strong>
    </div>
  </div>;
}

function animalKnowledge(animal: Animal) {
  return getBreedKnowledge(animal);
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
  const shelterAddressLabel = displayShelterAddress(shelterAddress);
  const shelterHref = animal.shelterId ? `/shelters/${encodeURIComponent(animal.shelterId)}` : null;
  const shelterMapHref = `https://map.kakao.com/link/search/${encodeURIComponent(`${animal.shelter} ${shelterAddress}`)}`;
  const weight = detailWeight(animal);
  const knowledge = animalKnowledge(animal);
  const foundArea = animal.life.find((item) => item.startsWith("발견 지역:"))?.replace("발견 지역:", "").replace(/\s*·\s*정확한 구조 위치 비공개\s*$/, "").trim() || "확인 필요";
  const publicState = publicStatus.publicState || "보호 중";
  const visibleTraits = animal.traits.filter((trait) => !isDuplicateTrait(trait, animal, colors, publicState));
  return (
    <>
      <AnimalDetailChromeBridge animalId={id} />
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
      <section className="ff-detail-container ff-detail-shelter" aria-label="보호소 정보">
        <div className="ff-detail-shelter-icon" aria-hidden><IconHospitalcrossBuildingLine /></div>
        {shelterHref ? <a className="ff-detail-shelter-copy ff-detail-shelter-link" href={shelterHref} aria-label={`${animal.shelter} 보호소 페이지 보기`}>
          <strong>{animal.shelter}</strong>
          <p className="ff-detail-shelter-address"><span>{shelterAddressLabel}</span></p>
          <ShelterTravelMeta distance={animal.distanceMeters} lat={animal.shelterLat} lng={animal.shelterLng} />
        </a> : <div className="ff-detail-shelter-copy">
          <strong>{animal.shelter}</strong>
          <p className="ff-detail-shelter-address"><span>{shelterAddressLabel}</span></p>
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
      <AdoptionPlanningCard species={animal.species} name={animal.name} breed={animal.breed} age={animal.age} sex={animal.sex} traits={animal.traits} health={animal.health} />
      <article className="ff-detail-container ff-detail-body">
        <h1 className="ff-visually-hidden">{animal.name}</h1>
        <div className="ff-detail-animal-info-group">
        <section className="ff-detail-info-section ff-detail-animal-info" aria-labelledby="detail-info-title">
          <h2 id="detail-info-title">동물 친구 정보</h2>
          <div className="ff-detail-info-list">
            <DetailInfoRow icon={IconCalendarLine} label="공고 기간" value={publicStatus.notice?.replace(/^공고\s*/, "") || "확인 필요"} />
            <DetailInfoRow icon={IconPawprintLine} label="종류" value={`${animal.species} · ${animal.breed}`} helper={knowledge.species} />
            <DetailInfoRow icon={IconNeedleScaleLine} label="크기" value={detailSize(animal)} helper={knowledge.size} />
            <DetailInfoRow icon={IconCheckmarkScaleLine} label="체중" value={weight === undefined ? "확인 필요" : `${weight}kg`} />
            <DetailInfoRow icon={IconTagLine} label="털색" value={colors.length ? colors.join(" · ") : "확인 필요"} />
            <DetailInfoRow icon={IconCalendarLine} label="나이" value={detailAge(animal).value} secondaryValue={detailAge(animal).actualAge} helper={knowledge.age} />
            <DetailInfoRow icon={IconMalesymbolFemalesymbolLine} label="성별" value={animal.sex || "확인 필요"} />
            <DetailInfoRow icon={IconCheckmarkCircleFill} label="중성화" value={detailNeutered(animal)} helper={knowledge.neutered} />
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
        </div>
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
            showPrefix={false}
            items={[
              {
                id: "contact",
                prefix: "Q",
                title: "보호소에 어떻게 연락하면 되나요?",
                content: (
                  <ol className="ff-info-board-steps">
                    <li>동물의 기본 정보와 보호소 메모를 꼼꼼히 읽고 확인하세요.</li>
                    <li>보호소 채널에서 운영시간을 확인하고, 전화 전에 공고번호와 동물 이름을 정확히 확인한 뒤 연락하세요.</li>
                    <li>통화가 어려우면 공개된 정보와 다를 수 있으니 카카오맵에서 업체 정보를 확인한 뒤 다시 연락하세요.</li>
                  </ol>
                ),
              },
              {
                id: "consultation",
                prefix: "Q",
                title: "상담 전에 무엇을 확인해야 하나요?",
                content: (
                  <p>
                    입양 가능 여부, 방문 예약, 필요한 서류와 비용을 먼저
                    확인하세요. 건강·성격·중성화·예방접종·특이사항은 보호소에
                    직접 묻고, 사진과 공개 정보만으로 결정하지 않습니다.
                  </p>
                ),
              },
              {
                id: "quiz",
                prefix: "Q",
                title: "입양 전 준비는 어떻게 하나요?",
                content: (
                  <p>
                    상세페이지의 ‘입양 준비 체크’ STEP 3과 ‘상식 퀴즈’ STEP
                    4에서 입양 전 준비와 함께 살며 알아둘 내용을 확인해
                    보세요. 퀴즈 결과는 판단 기준이 아니라 상담을 준비하는
                    참고 자료예요.
                  </p>
                ),
              },
              {
                id: "handover",
                prefix: "Q",
                title: "보호소에서 데려올 때 무엇을 준비하나요?",
                content: (
                  <p>
                    고양이는 잠금 가능한 이동장, 강아지는 체형에 맞는 하네스와
                    리드줄을 준비하세요. 인계 서류와 진료·접종 기록을 확인하고,
                    이동 중 문이 열리지 않도록 안전하게 고정합니다.
                  </p>
                ),
              },
              {
                id: "first-day",
                prefix: "Q",
                title: "집에 온 첫날은 어떻게 맞이하나요?",
                content: (
                  <p>
                    바로 만지거나 여러 사람에게 소개하기보다 조용한 공간에서
                    스스로 둘러볼 시간을 주세요. 먹는 양과 배변을 살피고,
                    이상이 있거나 기록이 필요하면 보호소와 동물병원에
                    상담하세요.
                  </p>
                ),
              },
            ]}
          />
        </section>
      </article>
      <AnimalActions animalId={animal.id} name={animal.name} shelterPhone={animal.shelterPhone} animal={animal} />
    </>
  );
}
