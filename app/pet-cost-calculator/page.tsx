import type { Metadata } from "next";
import Link from "next/link";
import { CostPlanner } from "../components/CostPlanner";

export const metadata: Metadata = {
  title: "반려동물 지출 계산기",
  description: "고양이와 강아지와 함께할 때 필요한 초기 준비 비용, 월 생활비와 응급 예비자금을 계산해 보세요.",
  keywords: ["반려동물 지출 계산기", "반려동물 비용", "강아지 비용", "고양이 비용"],
};

type PageProps = { searchParams: Promise<{ species?: string }> };

export default async function PetCostCalculatorPage({ searchParams }: PageProps) {
  const query = await searchParams;
  const initialSpecies = query.species === "dog" ? "dog" : "cat";

  return <div className="ff-cost-page"><header className="ff-cost-page-header"><Link className="ff-cost-page-back" href="/" aria-label="홈으로 돌아가기">‹</Link><strong>반려동물 지출 계산기</strong><span aria-hidden="true" /></header><article className="ff-cost-page-content"><header className="ff-page-header"><div className="ff-kicker">함께살이 예산 점검</div><h1 className="ff-title">함께할 준비에<br />필요한 비용을 계산해요</h1><p className="ff-description">한국 생활 기준으로 초기 준비 비용과 매달 필요한 생활비 범위를 확인해 보세요.</p></header><CostPlanner initialSpecies={initialSpecies} /></article></div>;
}
