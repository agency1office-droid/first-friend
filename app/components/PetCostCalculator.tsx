"use client";

import { useState } from "react";
import { IconPlusLine, IconXmarkLine } from "@karrotmarket/react-monochrome-icon";
import {
  BottomSheetBody,
  BottomSheetContent,
  BottomSheetRoot,
  BottomSheetTrigger,
} from "seed-design/ui/bottom-sheet";
import { CostPlanner, type CalculatorAnimal } from "./CostPlanner";

export function PetCostCalculator({ animal }: { animal: CalculatorAnimal }) {
  const [open, setOpen] = useState(false);

  return <BottomSheetRoot open={open} onOpenChange={setOpen} handleOnly>
    <BottomSheetTrigger asChild>
      <button className="ff-pet-cost-calculator-trigger ff-adoption-planning-row" type="button">
        <span>반려동물 돌봄 계산기</span>
        <IconPlusLine aria-hidden />
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
