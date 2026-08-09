import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { desc, eq } from "drizzle-orm";
import { getAnimals, getShelterById } from "../../../lib/public-data";
import { shelterNeeds, shelterProfiles, shelterUpdates, volunteerPosts } from "../../../db/schema";
import { AnimalCard } from "../../components/AnimalCard";
import { SupportIntentButton } from "../../components/SupportIntentButton";
import { VolunteerButton } from "../../components/VolunteerButton";
import { ShelterReactionButton } from "../../components/ShelterReactionButton";
import { Badge } from "@seed-design/react";
import { Callout } from "seed-design/ui/callout";
import { List, ListDivider, ListItem } from "seed-design/ui/list";
import { ActionButton } from "seed-design/ui/action-button";
import { IconCalendarLine, IconCheckmarkShieldFill, IconGiftLine, IconHospitalcrossBuildingLine } from "@karrotmarket/react-monochrome-icon";

export const dynamic = "force-dynamic";
export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> { const { id } = await params, shelter = await getShelterById(decodeURIComponent(id)); return shelter ? { title: shelter.name, description: `${shelter.organization} 보호센터 정보와 보호동물, 봉사·후원 안내` } : {}; }

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params, publicId = decodeURIComponent(id), shelter = await getShelterById(publicId); if (!shelter) notFound();
  const animals = (await getAnimals(100)).filter(animal => animal.shelter === shelter.name).slice(0, 6), region = shelter.address.split(" ").slice(0, 2).join(" ");
  let profile: typeof shelterProfiles.$inferSelect | undefined; let updates: typeof shelterUpdates.$inferSelect[] = [], volunteers: typeof volunteerPosts.$inferSelect[] = [], needs: typeof shelterNeeds.$inferSelect[] = [];
  if (!(typeof process !== "undefined" && process.release?.name === "node")) try { const { getDb } = await import("../../../db"), db = getDb(); profile = await db.query.shelterProfiles.findFirst({ where: eq(shelterProfiles.publicId, publicId) }); if (profile) [updates, volunteers, needs] = await Promise.all([db.select().from(shelterUpdates).where(eq(shelterUpdates.shelterId, profile.id)).orderBy(desc(shelterUpdates.createdAt)), db.select().from(volunteerPosts).where(eq(volunteerPosts.shelterId, profile.id)).orderBy(desc(volunteerPosts.createdAt)), db.select().from(shelterNeeds).where(eq(shelterNeeds.shelterId, profile.id))]); } catch { /* 공개 공공데이터 프로필은 계속 표시 */ }
  const openVolunteers = volunteers.filter(item => item.status === "open"), openNeeds = needs.filter(item => item.status === "needed");
  const mapHref=`https://www.openstreetmap.org/?mlat=${shelter.lat}&mlon=${shelter.lng}#map=16/${shelter.lat}/${shelter.lng}`;
  return <div className="ff-page"><header className="ff-shelter-profile"><div className="ff-shelter-avatar"><IconHospitalcrossBuildingLine /></div><div><Badge tone={profile?.verified ? "positive" : "neutral"} variant="weak">{profile?.verified ? <><IconCheckmarkShieldFill /> 인증 보호소</> : "공공 보호센터 정보"}</Badge><h1>{shelter.name}</h1><p>{shelter.organization} · {region}</p>{profile?.introduction && <p>{profile.introduction}</p>}</div></header><div className="ff-shelter-channel-actions"><ActionButton asChild><a href={`tel:${shelter.phone.replace(/[^\d+]/g,"")}`}>전화 문의</a></ActionButton><ActionButton asChild variant="neutralSolid"><a href={mapHref} target="_blank" rel="noreferrer">찾아오는 길</a></ActionButton></div><Callout tone="informative" title="방문 전 확인" description={`${shelter.hours} · ${shelter.closed}. 운영시간·봉사 가능 여부는 바뀔 수 있어 먼저 문의하세요.`} />
    {!profile && <Callout tone="warning" title="아직 보호소 담당자 채널이 연결되지 않았어요" description="공공 정보와 동물 목록은 계속 볼 수 있습니다. 담당자가 입점 인증을 마치면 기존 입양 신청·후원 의향·봉사 지원까지 관리자 화면으로 자동 연결돼요." linkProps={{href:"/verification",children:"보호소 담당자 입점 신청"}}/>}
    <section className="ff-section"><h2 className="ff-section-title">보호소 소식</h2>{updates.length ? <div className="ff-shelter-updates">{updates.filter(item => !item.hidden).map(update => <article key={update.id}><span>{update.category}</span><h3>{update.title}</h3><p>{update.body}</p><ShelterReactionButton updateId={update.id} initialCount={update.reactions}/></article>)}</div> : <div className="ff-empty">보호소 담당자가 직접 올린 소식이 아직 없습니다.</div>}</section>
    <section className="ff-section"><h2 className="ff-section-title">봉사·도움 공고</h2>{openVolunteers.length || openNeeds.length ? <List>{openVolunteers.map((post, index) => <div key={post.id}><ListItem prefix={<IconCalendarLine />} title={post.title} detail={`${post.description}\n${post.scheduledAt} · 정원 ${post.capacity}명`} suffix={<VolunteerButton shelterId={publicId} shelterName={shelter.name} region={region} postId={post.id} />} />{index < openVolunteers.length - 1 && <ListDivider />}</div>)}{openNeeds.map(need => <div key={need.id}><ListDivider /><ListItem prefix={<IconGiftLine />} title={need.itemName} detail={`필요 ${need.targetQuantity} · 전달 확인 ${need.receivedQuantity}${need.unitPrice ? ` · 참고 단가 ${need.unitPrice.toLocaleString()}원` : ""}`} suffix={<SupportIntentButton kind="shelter_item" title={`${shelter.name} · ${need.itemName}`} targetId={String(need.id)} label="지원 의향" />} /></div>)}</List> : <div className="ff-empty">현재 공개된 봉사 공고나 필요 물품이 없습니다.</div>}</section>
    <section className="ff-section"><div className="ff-section-head"><h2 className="ff-section-title">이 보호소의 친구</h2><span className="ff-meta">{animals.length}마리</span></div>{animals.length ? <div className="ff-animal-grid">{animals.map(animal => <AnimalCard key={animal.id} animal={animal} />)}</div> : <div className="ff-empty">현재 불러온 목록에 연결된 친구가 없어요. 보호센터에 최신 보호 현황을 확인해 주세요.</div>}</section></div>;
}
