"use client";

import { useState, type MouseEvent } from "react";
import Link from "next/link";
import { IconArrowUpRightLine } from "@karrotmarket/react-monochrome-icon";
import { PetCostCalculator } from "./PetCostCalculator";
import { ReadinessQuiz } from "./ReadinessQuiz";
import type { Animal } from "../../lib/data";
import { buildQuizHref } from "./detailReturn";

export function AdoptionPlanningCard(props: Pick<Animal, "name" | "species" | "breed" | "age" | "sex" | "traits" | "health">) {
  const [knowledgeQuizOpen, setKnowledgeQuizOpen] = useState(false);

  function openQuiz(event: MouseEvent<HTMLAnchorElement>) {
    if (event.defaultPrevented || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey || event.button !== 0) return;
    const isMobile = window.matchMedia("(max-width: 767px)").matches;
    event.preventDefault();
    const href = buildQuizHref(event.currentTarget.href);
    if (isMobile) {
      window.location.assign(href);
      return;
    }
    event.currentTarget.href = href;
    const quizWindow = window.open(event.currentTarget.href, "_blank");
    if (!quizWindow) window.location.assign(href);
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
        <Link className="ff-adoption-planning-row" href="/quiz/adoption-prep" onClick={openQuiz}>
          <span className="ff-adoption-planning-step">STEP 2</span>
          <span className="ff-adoption-planning-row-copy"><strong>입양 전 준비 확인</strong></span>
          <IconArrowUpRightLine aria-hidden />
        </Link>
        <PetCostCalculator animal={props} step={3} />
        <button className="ff-pet-knowledge-trigger" type="button" onClick={() => setKnowledgeQuizOpen(true)}><span className="ff-adoption-planning-step">STEP 4</span><span className="ff-adoption-planning-row-copy"><strong>반려동물 상식 퀴즈</strong></span><IconArrowUpRightLine aria-hidden /></button>
      </div>
      {knowledgeQuizOpen && <div className="ff-adoption-test-page"><ReadinessQuiz quizId="pet-knowledge" onClose={() => setKnowledgeQuizOpen(false)} /></div>}
    </section>
  );
}
