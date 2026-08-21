"use client";

import Link from "next/link";
import { IconPlusLine } from "@karrotmarket/react-monochrome-icon";

type Species = "cat" | "dog";

export function PetCostCalculator({ species }: { species: string }) {
  const initialSpecies: Species = species.includes("고양이") ? "cat" : "dog";

  return <Link className="ff-pet-cost-calculator-trigger ff-adoption-planning-row" href={`/quiz/pet-cost?species=${initialSpecies}`}><span>반려동물 지출 계산기</span><IconPlusLine aria-hidden /></Link>;
}
