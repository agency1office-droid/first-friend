import type { Metadata } from "next";
import { cache } from "react";
import { notFound } from "next/navigation";
import { getShelterById } from "../../../lib/public-data";
import { getSupabaseServerClient } from "../../../lib/supabase/server";
import { getAnimalsByShelterId } from "../../../lib/public-animal-store";
import { localShelterDemoContent } from "../../../lib/shelter-demo";
import { AnimalCard } from "../../components/AnimalCard";
import { SupportIntentButton } from "../../components/SupportIntentButton";
import { VolunteerButton } from "../../components/VolunteerButton";
import { ShelterReactionButton } from "../../components/ShelterReactionButton";
import { ShelterChannelActions } from "../../components/ShelterChannelActions";
import { ShelterSectionNav } from "../../components/ShelterSectionNav";
import { ShelterLocationCard } from "../../components/ShelterLocationCard";
import { NearbyTransitRow } from "../../components/NearbyTransitRow";
import { ShelterAddressRow } from "../../components/ShelterAddressRow";
import { ShelterInfoValue } from "../../components/ShelterInfoValue";
import { Badge } from "seed-design/ui/badge";
import {
  IconArticleLine,
  IconCalendarLine,
  IconCheckmarkShieldFill,
  IconClockLine,
  IconGiftLine,
  IconHospitalcrossBuildingLine,
  IconPawprintLine,
  IconPhoneLine,
} from "@karrotmarket/react-monochrome-icon";

export const dynamic = "force-dynamic";
const updateCategoryLabels: Record<string, string> = { daily: "일상", urgent: "긴급", result: "지원 결과", notice: "공지" };
const volunteerCategoryLabels: Record<string, string> = { cleaning: "환경 정리", photography: "사진 촬영", transport: "이동 지원", medical: "의료 봉사", care: "돌봄", event: "행사 지원" };
const getCachedShelterById = cache(getShelterById);
type UpdateRow = { id: number; category: string; createdAt: string; title: string; body: string; reactions: number; hidden: boolean };
type VolunteerRow = { id: number; category: string; scheduledAt: string; shelterId: number; createdAt: string; region: string; title: string; description: string; capacity: number; status: string };
type NeedRow = { id: number; itemName: string; targetQuantity: number; receivedQuantity: number; unitPrice: number; status: string };
function compactDate(value: string) {
  const [, month, day] = value.slice(0, 10).split("-").map(Number);
  return `${month}월 ${day}일`;
}
export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params,
    shelter = await getCachedShelterById(decodeURIComponent(id));
  return shelter
    ? {
        title: shelter.name,
        description: `${shelter.organization} 보호센터 정보와 보호동물, 봉사·후원 안내`,
      }
    : {};
}

export default async function Page({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ tab?: string }>;
}) {
  const { id } = await params,
    { tab } = await searchParams,
    publicId = decodeURIComponent(id),
    shelter = await getCachedShelterById(publicId);
  if (!shelter) notFound();
  const shelterAnimals = await getAnimalsByShelterId(publicId),
    animals = shelterAnimals.items,
    region = shelter.address.split(" ").slice(0, 2).join(" ");
  let profile: Record<string, unknown> | undefined;
  let updates: UpdateRow[] = [], volunteers: VolunteerRow[] = [], needs: NeedRow[] = [];
  try { const client = getSupabaseServerClient(), { data: rawProfile } = await client.from("shelter_profiles").select("*").eq("public_id", publicId).maybeSingle(); if (rawProfile) { profile = { ...rawProfile, publicId: rawProfile.public_id, ownerId: rawProfile.owner_id, createdAt: rawProfile.created_at }; const [{ data: rawUpdates }, { data: rawVolunteers }, { data: rawNeeds }] = await Promise.all([client.from("shelter_updates").select("*").eq("shelter_id", rawProfile.id).order("created_at", { ascending: false }), client.from("volunteer_posts").select("*").eq("shelter_id", rawProfile.id).order("created_at", { ascending: false }), client.from("shelter_needs").select("*").eq("shelter_id", rawProfile.id)]); updates = (rawUpdates || []).map(row => ({ ...row, createdAt: row.created_at, authorId: row.author_id })); volunteers = (rawVolunteers || []).map(row => ({ ...row, scheduledAt: row.scheduled_at, shelterId: row.shelter_id, createdAt: row.created_at })); needs = (rawNeeds || []).map(row => ({ ...row, itemName: row.item_name, targetQuantity: row.target_quantity, receivedQuantity: row.received_quantity, unitPrice: row.unit_price })); } } catch { /* 공개 공공데이터 프로필은 계속 표시 */ }
  const localDemo = process.env.NODE_ENV !== "production" ? localShelterDemoContent(region) : null,
    realOpenVolunteers = volunteers.filter((item) => item.status === "open"),
    realOpenNeeds = needs.filter((item) => item.status === "needed"),
    realVisibleUpdates = updates.filter((item) => !item.hidden),
    openVolunteers = realOpenVolunteers.length ? realOpenVolunteers : (localDemo?.volunteers ?? []),
    openNeeds = realOpenNeeds.length ? realOpenNeeds : (localDemo?.needs ?? []),
    visibleUpdates = realVisibleUpdates.length ? realVisibleUpdates : (localDemo?.updates ?? []),
    activeTab = (["info", "updates", "support", "animals"] as const).find((item) => item === tab) || "info";
  const mapHref = `https://map.kakao.com/link/to/${encodeURIComponent(shelter.name)},${shelter.lat},${shelter.lng}`;
  return (
    <div className="ff-page ff-shelter-channel-page">
      <header className="ff-shelter-profile">
        <div className="ff-shelter-profile-identity">
          <div className="ff-shelter-avatar" aria-hidden="true">
            <IconHospitalcrossBuildingLine />
          </div>
          <div className="ff-shelter-profile-copy">
            <div className="ff-shelter-profile-heading">
              <h1>{shelter.name}</h1>
              <Badge className="ff-shelter-profile-badge" size="medium" tone={profile?.verified ? "positive" : "neutral"} variant="weak">
                {profile?.verified ? <><IconCheckmarkShieldFill /> 퍼스트프렌드 인증</> : "공공데이터 등록"}
              </Badge>
            </div>
          </div>
        </div>
      </header>
      <ShelterChannelActions shelterId={publicId} name={shelter.name} phone={shelter.phone} mapHref={mapHref} infoHref={`/shelters/${encodeURIComponent(publicId)}?tab=info`}/>
      <ShelterSectionNav shelterId={publicId} active={activeTab} updateCount={visibleUpdates.length} animalCount={shelterAnimals.total} supportCount={openVolunteers.length + openNeeds.length}/>
      {activeTab === "animals" && <section className="ff-section ff-shelter-channel-section" id="shelter-animals" aria-label="보호동물">
        <p className="ff-shelter-animal-summary"><strong>{shelterAnimals.total}마리</strong>가 새 가족을 기다리고 있어요</p>
        {animals.length ? (
          <div className="ff-animal-list">
            {animals.map((animal) => <AnimalCard key={animal.id} animal={animal} layout="row" showShelter={false} />)}
          </div>
        ) : (
          <div className="ff-empty">현재 공공데이터에서 보호 중으로 확인되는 친구가 없어요. 최신 보호 현황은 보호센터에 문의해 주세요.</div>
        )}
      </section>}
      {activeTab === "updates" && <section className="ff-section ff-shelter-channel-section" id="shelter-updates" aria-label="보호소 소식">
        <h2 className="ff-section-title">보호소 소식</h2>
        {visibleUpdates.length ? (
          <div className="ff-shelter-updates">
            {visibleUpdates.map((update) => (
                <article key={update.id}>
                  <div className="ff-shelter-update-meta">
                    <span className="ff-update-category">{updateCategoryLabels[update.category] || update.category}</span>
                    <time dateTime={update.createdAt}>{compactDate(update.createdAt)}</time>
                  </div>
                  <h3>{update.title}</h3>
                  <p>{update.body}</p>
                  <div className="ff-shelter-update-actions">
                    <ShelterReactionButton updateId={update.id} initialCount={update.reactions} demo={update.id < 0}/>
                  </div>
                </article>
              ))}
          </div>
        ) : (
          <div className="ff-empty">
            등록된 소식이 아직 없어요.
          </div>
        )}
      </section>}
      {activeTab === "support" && <section className="ff-section ff-shelter-channel-section" id="shelter-support" aria-label="봉사와 후원">
        <h2 className="ff-section-title">함께할 수 있는 일</h2>
        {openVolunteers.length || openNeeds.length ? (
          <div className="ff-shelter-help-groups">
            {openVolunteers.length > 0 && <section className="ff-shelter-help-group" aria-labelledby="volunteer-list-title">
              <header className="ff-shelter-help-heading">
                <span aria-hidden="true"><IconCalendarLine/></span>
                <div><h3 id="volunteer-list-title">봉사 모집</h3><p>가능한 일정과 역할을 확인하고 신청해 보세요.</p></div>
              </header>
              <div className="ff-shelter-volunteer-list">
                {openVolunteers.map((post) => (
                  <article key={post.id}>
                    <div className="ff-volunteer-meta"><span>{volunteerCategoryLabels[post.category] || post.category}</span><span>{post.region}</span></div>
                    <h4>{post.title}</h4>
                    <p>{post.description}</p>
                    <footer>
                      <div className="ff-volunteer-facts"><span>{post.scheduledAt}</span><span>{post.capacity}명 모집</span></div>
                      <VolunteerButton shelterId={publicId} shelterName={shelter.name} region={region} postId={post.id} demo={post.id < 0}/>
                    </footer>
                  </article>
                ))}
              </div>
            </section>}
            {openNeeds.length > 0 && <section className="ff-shelter-help-group" aria-labelledby="needs-list-title">
              <header className="ff-shelter-help-heading">
                <span aria-hidden="true"><IconGiftLine/></span>
                <div><h3 id="needs-list-title">필요한 물품</h3><p>보호소가 요청한 수량과 전달 현황을 확인할 수 있어요.</p></div>
              </header>
              <div className="ff-shelter-needs-list">
                {openNeeds.map((need) => {
                  const progress = Math.min(100, Math.round((need.receivedQuantity / Math.max(1, need.targetQuantity)) * 100));
                  return <article key={need.id}>
                    <header><h4>{need.itemName}</h4>{need.unitPrice > 0 && <span>개당 약 {need.unitPrice.toLocaleString()}원</span>}</header>
                    <div className="ff-need-progress" role="progressbar" aria-label={`${need.itemName} 전달 현황`} aria-valuemin={0} aria-valuemax={need.targetQuantity} aria-valuenow={need.receivedQuantity}>
                      <span style={{ width: `${progress}%` }}/>
                    </div>
                    <footer>
                      <p><strong>{need.receivedQuantity}개</strong> 도착 · {Math.max(0, need.targetQuantity - need.receivedQuantity)}개 더 필요해요</p>
                      <SupportIntentButton kind="shelter_item" title={`${shelter.name} · ${need.itemName}`} targetId={String(need.id)} label="도움 주기" demo={need.id < 0} size="small"/>
                    </footer>
                  </article>;
                })}
              </div>
            </section>}
          </div>
        ) : (
          <div className="ff-empty">
            현재 모집 중인 봉사나 후원 요청이 없어요.
          </div>
        )}
      </section>}
      {activeTab === "info" && <section className="ff-section ff-shelter-channel-section" id="shelter-info" aria-label="보호소 정보">
        <h2 className="ff-section-title">보호소 정보</h2>
        <ShelterLocationCard
          jsKey={process.env.NEXT_PUBLIC_KAKAO_JS_KEY || ""}
          name={shelter.name}
          lat={shelter.lat}
          lng={shelter.lng}
          approximate={shelter.approximateLocation}
        />
        <div className="ff-shelter-info-board">
          <ShelterAddressRow address={shelter.address} lat={shelter.lat} lng={shelter.lng}/>
          <NearbyTransitRow lat={shelter.lat} lng={shelter.lng}/>
          <div id="shelter-hours"><IconClockLine aria-hidden="true"/><span>운영시간</span><ShelterInfoValue value={shelter.hours}/></div>
          <div><IconCalendarLine aria-hidden="true"/><span>휴무 안내</span><ShelterInfoValue value={shelter.closed}/></div>
          <div><IconPhoneLine aria-hidden="true"/><span>연락처</span><ShelterInfoValue value={shelter.phone} copyLabel="연락처"/></div>
          <div><IconPawprintLine aria-hidden="true"/><span>보호 대상</span><ShelterInfoValue value={shelter.animals}/></div>
          <div><IconHospitalcrossBuildingLine aria-hidden="true"/><span>운영 기관</span><ShelterInfoValue value={shelter.organization}/></div>
          {profile?.introduction && <div><IconArticleLine aria-hidden="true"/><span>보호소 소개</span><ShelterInfoValue value={profile.introduction}/></div>}
        </div>
        <p className="ff-description ff-shelter-data-note">
          <span>공공데이터와 보호소 확인 정보를 함께 보여드려요.</span>
          <span>방문 전 운영시간과 상담 가능 여부를 확인해 주세요.</span>
        </p>
      </section>}
    </div>
  );
}
