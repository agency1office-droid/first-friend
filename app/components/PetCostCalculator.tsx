"use client";

import { useState } from "react";
import { IconArrowUpRightLine, IconXmarkLine } from "@karrotmarket/react-monochrome-icon";
import {
  BottomSheetBody,
  BottomSheetContent,
  BottomSheetRoot,
  BottomSheetTrigger,
} from "seed-design/ui/bottom-sheet";
import { CostPlanner, type CalculatorAnimal } from "./CostPlanner";

export function PetCostCalculator({ animal, step = 3 }: { animal: CalculatorAnimal; step?: number }) {
  const [open, setOpen] = useState(false);

  return <BottomSheetRoot open={open} onOpenChange={setOpen} handleOnly>
    <BottomSheetTrigger asChild>
      <button className="ff-pet-cost-calculator-trigger ff-adoption-planning-row" type="button">
        <span className="ff-adoption-planning-step" aria-hidden="true">{step}</span>
        <span className="ff-adoption-planning-row-copy"><strong>반려동물 돌봄 계산기</strong></span>
        <IconArrowUpRightLine aria-hidden />
      </button>
    </BottomSheetTrigger>
    <BottomSheetContent
      aria-label="반려동물 돌봄 계산기"
      className="ff-pet-cost-calculator-sheet"
    >
      <button className="seed-bottom-sheet__closeButton" type="button" aria-label="계산기 닫기" data-no-drag onClick={() => setOpen(false)}><IconXmarkLine aria-hidden /></button>
      <BottomSheetBody>
        <CostPlanner flow="sheet" animal={animal} />
      </BottomSheetBody>
    </BottomSheetContent>
  </BottomSheetRoot>;
}
