"use client";

import { useState } from "react";
import { CostPlanner, type CalculatorAnimal } from "../components/CostPlanner";
import { PET_COST_ANIMAL_KEY } from "../components/PetCostCalculator";

export function PetCostCalculatorPage() {
  const [animal] = useState<CalculatorAnimal | undefined>(() => {
    if (typeof window === "undefined") return undefined;
    try {
      const stored = window.sessionStorage.getItem(PET_COST_ANIMAL_KEY);
      return stored ? JSON.parse(stored) as CalculatorAnimal : undefined;
    } catch {
      return undefined;
    }
  });

  return <main className="ff-page ff-pet-cost-calculator-page">
    <header className="ff-page-header"><div className="ff-kicker">입양 전에 꼭 확인해요</div><h1 className="ff-title">반려동물 돌봄 계산기</h1><p className="ff-description">이 친구와 함께할 때 필요한 처음 비용을 차근차근 확인해 보세요.</p></header>
    <CostPlanner flow="steps" animal={animal} />
  </main>;
}
