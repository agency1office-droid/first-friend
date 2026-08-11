import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getAnimalById } from "../../../lib/public-data";
import { getAnimalPublicStatus } from "../../../lib/animal-public-status";
import { ActionButton } from "seed-design/ui/action-button";
import { Callout } from "seed-design/ui/callout";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "입양 신청" };

export default async function ApplyPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const animal = await getAnimalById(id);
  if (!animal) notFound();
  const publicStatus = getAnimalPublicStatus(animal);
  if (publicStatus.phase === "ended") return <div className="ff-page">
    <header className="ff-page-header"><div className="ff-kicker">보호 절차 종료</div><h1 className="ff-title">현재 입양 신청을<br/>받지 않아요</h1></header>
    <Callout tone="neutral" title={publicStatus.statusLabel} description={publicStatus.description || "공공데이터에서 보호 절차가 종료된 동물이에요."}/>
    <ActionButton asChild variant="neutralWeak"><a href="/find">다른 친구 만나기</a></ActionButton>
  </div>;
  return <div className="ff-page">
    <header className="ff-page-header"><div className="ff-kicker">공공 보호동물 정보</div><h1 className="ff-title">신청 전에<br/>보호소 확인이 필요해요</h1></header>
    <Callout tone={publicStatus.tone} title={publicStatus.detailTitle || publicStatus.statusLabel} description={publicStatus.description || "공공데이터만으로 입양 가능 여부를 확정할 수 없어요."}/>
    <div className="ff-stack" style={{ marginTop: 16 }}>
      {animal.shelterPhone&&<ActionButton asChild><a href={`tel:${animal.shelterPhone.replace(/[^0-9+]/g, "")}`}>{publicStatus.phase === "notice" ? "이 동물을 아는 경우 보호소에 연락" : "입양 상담을 위해 보호소에 연락"}</a></ActionButton>}
      <ActionButton asChild variant="neutralWeak"><a href={`/friends/${animal.id}`}>친구 정보로 돌아가기</a></ActionButton>
    </div>
  </div>;
}
