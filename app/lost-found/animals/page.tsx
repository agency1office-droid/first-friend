import type { Metadata } from "next";
import Link from "next/link";
import { getStoredLostAnimals } from "../../../lib/public-animal-store";
import { NearbyLostList } from "../../components/NearbyLostList";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "실종 동물" };

export default async function Page() {
  const animals = await getStoredLostAnimals(24);
  return <div className="ff-page">
    <header className="ff-page-header">
      <div className="ff-kicker">공공 분실동물 정보 연동</div>
      <h1 className="ff-title">가족을 찾고 있는<br />강아지와 고양이</h1>
      <p className="ff-description">우리 동네에서 가족을 찾고 있는 동물만 모아 보여드려요. 제보나 신고는 안전한 연결을 위해 별도로 운영합니다.</p>
    </header>
    <NearbyLostList initialAnimals={animals} limit={24} heading="h2" emptyText="우리 동네에 공개된 실종 동물 정보가 없어요." />
    <div className="ff-inline-actions" style={{ marginTop: 20 }}><Link className="ff-action-link" href="/lost-found">실종·발견 신고와 제보</Link></div>
  </div>;
}
