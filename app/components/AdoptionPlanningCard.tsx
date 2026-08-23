"use client";

import { type MouseEvent } from "react";
import Link from "next/link";
import { IconArrowUpRightLine } from "@karrotmarket/react-monochrome-icon";
import { PetCostCalculator } from "./PetCostCalculator";
import type { Animal } from "../../lib/data";
import { openDetailFlow } from "./detailReturn";

export function AdoptionPlanningCard(props: Pick<Animal, "name" | "species" | "breed" | "age" | "sex" | "traits" | "health">) {
  function openQuiz(event: MouseEvent<HTMLAnchorElement>) {
    if (event.defaultPrevented || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey || event.button !== 0) return;
    event.preventDefault();
    openDetailFlow(event.currentTarget.href);
  }

  return (
    <section className="ff-adoption-planning" aria-labelledby="adoption-planning-title">
      <div className="ff-section-head">
        <div>
          <div className="ff-kicker">입양 전에 꼭 확인해요</div>
          <h2 className="ff-section-title" id="adoption-planning-title">입양 전 준비 확인</h2>
        </div>
      </div>
      <div className="ff-adoption-planning-list">
        <Link className="ff-adoption-planning-row" href="/quiz/care-readiness" onClick={openQuiz}>
          <span className="ff-adoption-planning-step">STEP 1</span>
          <span className="ff-adoption-planning-row-copy"><strong>함께할 수 있는 생활인지 확인</strong></span>
          <IconArrowUpRightLine aria-hidden />
        </Link>
        <PetCostCalculator animal={props} step={2} />
        <Link className="ff-adoption-planning-row" href="/quiz/adoption-prep" onClick={openQuiz}>
          <span className="ff-adoption-planning-step">STEP 3</span>
          <span className="ff-adoption-planning-row-copy"><strong>입양 전 준비 확인</strong></span>
          <IconArrowUpRightLine aria-hidden />
        </Link>
        <button className="ff-pet-knowledge-trigger" type="button" onClick={() => openDetailFlow("/quiz/pet-knowledge")}><span className="ff-adoption-planning-step">STEP 4</span><span className="ff-adoption-planning-row-copy"><strong>반려동물 상식 퀴즈</strong></span><IconArrowUpRightLine aria-hidden /></button>
      </div>
    </section>
  );
}
