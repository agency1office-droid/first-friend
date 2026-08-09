import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getAnimalById } from "../../../lib/public-data";
import { ApplicationForm } from "../../components/ApplicationForm";
import { List, ListItem, ListDivider } from "seed-design/ui/list";
import { IconCheckmarkCircleFill } from "@karrotmarket/react-monochrome-icon";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "입양 신청" };

export default async function ApplyPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const animal = await getAnimalById(id);
  if (!animal) notFound();
  return <div className="ff-page">
    <header className="ff-page-header"><div className="ff-kicker">안전한 입양</div><h1 className="ff-title">{animal.name}에게<br/>마음을 전해요</h1><p className="ff-description">신청 순서가 입양을 결정하지 않아요. 실제 입양 가능 여부와 절차는 관할 보호센터가 확인합니다.</p></header>
    <List><ListItem prefix={<IconCheckmarkCircleFill/>} title="신청서와 준비도 확인" detail="모든 신청자를 빠짐없이 확인해요."/><ListDivider/><ListItem prefix={<IconCheckmarkCircleFill/>} title="보호센터 정보 확인" detail="공고 상태와 인계 조건을 다시 확인해요."/><ListDivider/><ListItem prefix={<IconCheckmarkCircleFill/>} title="안전 동의와 인계" detail="양쪽이 확인한 뒤 가족이 됩니다."/></List>
    <div className="ff-divider"/><section className="ff-section"><ApplicationForm animalId={animal.id} animalName={animal.name}/></section>
  </div>;
}
