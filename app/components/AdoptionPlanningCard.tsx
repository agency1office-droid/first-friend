"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { IconPlusLine } from "@karrotmarket/react-monochrome-icon";
import { PetCostCalculator } from "./PetCostCalculator";
import { ReadinessQuiz } from "./ReadinessQuiz";
import type { Animal } from "../../lib/data";

type Assessment = { passed?: boolean };
type Status = "loading" | "guest" | "incomplete" | "completed";

export function AdoptionPlanningCard(props: Pick<Animal, "name" | "species" | "breed" | "age" | "sex" | "traits" | "health">) {
  const [status, setStatus] = useState<Status>("loading");
  const [knowledgeQuizOpen, setKnowledgeQuizOpen] = useState(false);

  useEffect(() => {
    let active = true;
    fetch("/api/readiness")
      .then(async response => {
        if (response.status === 401) return { guest: true };
        if (!response.ok) throw new Error("readiness_unavailable");
        return response.json() as Promise<{ assessment?: Assessment | null }>;
      })
      .then(body => {
        if (!active) return;
        if ("guest" in body) setStatus("guest");
        else setStatus(body.assessment?.passed ? "completed" : "incomplete");
      })
      .catch(() => { if (active) setStatus("guest"); });
    return () => { active = false; };
  }, []);

  const loading = status === "loading";
  const completed = status === "completed";
  const statusLabel = loading ? "확인 중" : completed ? "수료" : "미수료";
  const statusDescription = loading ? "수료 여부를 확인하고 있어요" : completed ? "입양 전 준비 확인을 수료했어요" : "아직 수료하지 않았어요";

  return (
    <section className="ff-adoption-planning" aria-labelledby="adoption-planning-title">
      <div className="ff-section-head">
        <div>
          <div className="ff-kicker">입양 전에 꼭 확인해요</div>
          <h2 className="ff-section-title" id="adoption-planning-title">입양 전 준비 확인</h2>
        </div>
      </div>
      <div className="ff-adoption-planning-list">
        <Link className="ff-adoption-planning-row" href="/quiz/adoption-prep">
          <span className="ff-adoption-planning-row-copy"><strong>입양 전 준비 확인</strong><small>{statusLabel} · {statusDescription}</small></span>
          <IconPlusLine aria-hidden />
        </Link>
        <PetCostCalculator animal={props} />
        <button className="ff-pet-knowledge-trigger" type="button" onClick={() => setKnowledgeQuizOpen(true)}><span>반려동물 상식 퀴즈</span><IconPlusLine aria-hidden /></button>
      </div>
      <p className="ff-adoption-planning-note">시험 결과는 입양 전 준비를 돕기 위한 참고 정보예요. 최종 상담과 입양 결정은 보호소와 함께 확인해 주세요.</p>
      {knowledgeQuizOpen && <div className="ff-adoption-test-page"><ReadinessQuiz quizId="pet-knowledge" onClose={() => setKnowledgeQuizOpen(false)} /></div>}
    </section>
  );
}
