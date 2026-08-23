"use client";

import { useState } from "react";
import Link from "next/link";
import { IconArrowUpRightLine } from "@karrotmarket/react-monochrome-icon";
import { PetCostCalculator } from "./PetCostCalculator";
import { ReadinessQuiz } from "./ReadinessQuiz";
import type { Animal } from "../../lib/data";

export function AdoptionPlanningCard(props: Pick<Animal, "name" | "species" | "breed" | "age" | "sex" | "traits" | "health">) {
  const [knowledgeQuizOpen, setKnowledgeQuizOpen] = useState(false);

  return (
    <section className="ff-adoption-planning" aria-labelledby="adoption-planning-title">
      <div className="ff-section-head">
        <div>
          <div className="ff-kicker">입양 전에 꼭 확인해요</div>
          <h2 className="ff-section-title" id="adoption-planning-title">입양 전 준비 확인</h2>
        </div>
      </div>
      <div className="ff-adoption-planning-list">
        <Link className="ff-adoption-planning-row" href="/quiz/care-readiness">
          <span className="ff-adoption-planning-step">STEP 1</span>
          <span className="ff-adoption-planning-row-copy"><strong>함께할 수 있는 생활인지 확인</strong></span>
          <IconArrowUpRightLine aria-hidden />
        </Link>
        <Link className="ff-adoption-planning-row" href="/quiz/adoption-prep">
          <span className="ff-adoption-planning-step">STEP 2</span>
          <span className="ff-adoption-planning-row-copy"><strong>입양 전 준비 확인</strong></span>
          <IconArrowUpRightLine aria-hidden />
        </Link>
        <PetCostCalculator animal={props} step={3} />
        <button className="ff-pet-knowledge-trigger" type="button" onClick={() => setKnowledgeQuizOpen(true)}><span className="ff-adoption-planning-step">STEP 4</span><span className="ff-adoption-planning-row-copy"><strong>반려동물 상식 퀴즈</strong></span><IconArrowUpRightLine aria-hidden /></button>
      </div>
      <p className="ff-adoption-planning-note">시험 결과는 입양 전 준비를 돕기 위한 참고 정보예요. 최종 상담과 입양 결정은 보호소와 함께 확인해 주세요.</p>
      {knowledgeQuizOpen && <div className="ff-adoption-test-page"><ReadinessQuiz quizId="pet-knowledge" onClose={() => setKnowledgeQuizOpen(false)} /></div>}
    </section>
  );
}
