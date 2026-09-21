"use client";

import { useSyncExternalStore, type MouseEvent } from "react";
import Link from "next/link";
import { Badge } from "seed-design/ui/badge";
import { readQuizCompletion, subscribeQuizCompletion, type CompletionQuiz } from "../../lib/quiz-completion";
import styles from "./AdoptionPlanningCard.module.css";
import { openDetailFlow } from "./detailReturn";

function CompletionBadge({ quiz }: { quiz: CompletionQuiz }) {
  const title = useSyncExternalStore(subscribeQuizCompletion, () => readQuizCompletion(quiz), () => "미수료");
  return <Badge className={styles.status} variant="weak" tone={title === "미수료" ? "neutral" : "brand"}>{title}</Badge>;
}

export function AdoptionPlanningCard() {
  function openQuiz(event: MouseEvent<HTMLAnchorElement>) {
    if (event.defaultPrevented || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey || event.button !== 0) return;
    event.preventDefault();
    openDetailFlow(event.currentTarget.href);
  }

  return (
    <section className="ff-detail-container ff-adoption-planning" aria-labelledby="adoption-planning-title">
      <div className="ff-section-head">
        <div>
          <div className="ff-kicker">입양 전에 꼭 확인해요</div>
          <h2 className="ff-section-title" id="adoption-planning-title">입양 전 준비 확인</h2>
        </div>
      </div>
      <div className="ff-adoption-planning-list">
        <Link className={`ff-adoption-planning-row ${styles.row}`} href="/quiz/care-readiness" onClick={openQuiz}>
          <span className="ff-adoption-planning-step">STEP 1</span>
          <span className="ff-adoption-planning-row-copy"><strong>입양 환경 점검</strong></span>
          <CompletionBadge quiz="care-readiness" />
        </Link>
        <Link className={`ff-adoption-planning-row ${styles.row}`} href="/quiz/adoption-prep" onClick={openQuiz}>
          <span className="ff-adoption-planning-step">STEP 2</span>
          <span className="ff-adoption-planning-row-copy"><strong>입양 준비 체크</strong></span>
          <CompletionBadge quiz="adoption-prep" />
        </Link>
        <button className={`ff-pet-knowledge-trigger ${styles.row}`} type="button" onClick={() => openDetailFlow("/quiz/pet-knowledge")}><span className="ff-adoption-planning-step">STEP 3</span><span className="ff-adoption-planning-row-copy"><strong>상식 퀴즈</strong></span><CompletionBadge quiz="pet-knowledge" /></button>
      </div>
    </section>
  );
}
