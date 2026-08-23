"use client";

import { IconArrowUpRightLine } from "@karrotmarket/react-monochrome-icon";
import type { CalculatorAnimal } from "./CostPlanner";
import { openDetailFlow } from "./detailReturn";

export const PET_COST_ANIMAL_KEY = "ff-pet-cost-animal-v1";

export function PetCostCalculator({ animal, step = 3 }: { animal: CalculatorAnimal; step?: number }) {
  function openCalculator() {
    try { window.sessionStorage.setItem(PET_COST_ANIMAL_KEY, JSON.stringify(animal)); } catch { /* storage can be unavailable */ }
    openDetailFlow("/pet-cost-calculator");
  }

  return <button className="ff-pet-cost-calculator-trigger ff-adoption-planning-row" type="button" onClick={openCalculator}>
    <span className="ff-adoption-planning-step">STEP {step}</span>
    <span className="ff-adoption-planning-row-copy"><strong>반려동물 돌봄 계산기</strong></span>
    <IconArrowUpRightLine aria-hidden />
  </button>;
}
