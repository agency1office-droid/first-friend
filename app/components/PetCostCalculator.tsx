"use client";

import { ActionButton } from "seed-design/ui/action-button";
import { BottomSheetBody, BottomSheetContent, BottomSheetRoot, BottomSheetTrigger } from "seed-design/ui/bottom-sheet";
import { IconWonCircleLine } from "@karrotmarket/react-monochrome-icon";
import { PrefixIcon } from "@seed-design/react";
import { CostPlanner } from "./CostPlanner";

type Species = "cat" | "dog";

export function PetCostCalculator({ species }: { species: string }) {
  const initialSpecies: Species = species.includes("고양이") ? "cat" : "dog";

  return (
    <BottomSheetRoot>
      <BottomSheetTrigger asChild>
        <ActionButton className="ff-pet-cost-calculator-trigger" variant="neutralWeak">
          <PrefixIcon svg={<IconWonCircleLine aria-hidden />} />
          반려동물 지출 계산기
        </ActionButton>
      </BottomSheetTrigger>
      <BottomSheetContent className="ff-pet-cost-calculator-sheet" title="반려동물 지출 계산기" description="한국 생활 기준으로 매달 필요한 비용과 초기 준비 범위를 계산해요." showHandle>
        <BottomSheetBody>
          <CostPlanner initialSpecies={initialSpecies} />
        </BottomSheetBody>
      </BottomSheetContent>
    </BottomSheetRoot>
  );
}
