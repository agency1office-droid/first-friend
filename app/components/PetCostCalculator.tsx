"use client";

import { BottomSheetBody, BottomSheetContent, BottomSheetRoot, BottomSheetTrigger } from "seed-design/ui/bottom-sheet";
import { IconPlusLine, IconWonCircleLine } from "@karrotmarket/react-monochrome-icon";
import { CostPlanner } from "./CostPlanner";

type Species = "cat" | "dog";

export function PetCostCalculator({ species }: { species: string }) {
  const initialSpecies: Species = species.includes("고양이") ? "cat" : "dog";

  return (
    <BottomSheetRoot>
      <BottomSheetTrigger asChild>
        <button type="button" className="ff-pet-cost-calculator-trigger ff-adoption-planning-row">
          <span className="ff-adoption-planning-row-icon" aria-hidden><IconWonCircleLine /></span>
          <span>반려동물 지출 계산기</span>
          <IconPlusLine aria-hidden />
        </button>
      </BottomSheetTrigger>
      <BottomSheetContent className="ff-pet-cost-calculator-sheet" title="반려동물 지출 계산기" description="한국 생활 기준으로 매달 필요한 비용과 초기 준비 범위를 계산해요." showHandle>
        <BottomSheetBody>
          <CostPlanner initialSpecies={initialSpecies} />
        </BottomSheetBody>
      </BottomSheetContent>
    </BottomSheetRoot>
  );
}
