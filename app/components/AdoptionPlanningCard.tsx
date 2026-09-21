"use client";

import { useEffect, useState, type MouseEvent } from "react";
import Link from "next/link";
import { Badge } from "seed-design/ui/badge";
import { quizCompletionEvent, type CompletionQuiz } from "../../lib/quiz-completion";
import styles from "./AdoptionPlanningCard.module.css";
import { openDetailFlow } from "./detailReturn";

function CompletionBadge({ title, status }: { title?: string; status: string }) {
  return <Badge className={styles.status} variant="weak" tone={title ? "brand" : "neutral"}>{title ?? status}</Badge>;
}

export function AdoptionPlanningCard() {
  const [completions, setCompletions] = useState<Partial<Record<CompletionQuiz, string>>>({});
  const [status, setStatus] = useState("확인 중");
  useEffect(() => {
    let active = true;
    let controller: AbortController;
    async function refresh() {
      controller?.abort();
      controller = new AbortController();
      const signal = controller.signal;
      setCompletions({});
      setStatus("확인 중");
      try {
        const response = await fetch("/api/quiz-completions", { cache: "no-store", credentials: "same-origin", signal });
        if (response.status === 401) {
          if (active && !signal.aborted) setStatus("도전하기");
          return;
        }
        if (!response.ok) throw new Error("load_failed");
        const body = await response.json();
        if (active && !signal.aborted) { setCompletions(body.completions); setStatus("도전하기"); }
      } catch {
        if (active && !signal.aborted) setStatus("확인 필요");
      }
    }
    void refresh();
    const update = () => { void refresh(); };
    window.addEventListener("focus", update);
    window.addEventListener("pageshow", update);
    window.addEventListener("storage", update);
    window.addEventListener(quizCompletionEvent, update);
    return () => {
      active = false;
      controller?.abort();
      window.removeEventListener("focus", update);
      window.removeEventListener("pageshow", update);
      window.removeEventListener("storage", update);
      window.removeEventListener(quizCompletionEvent, update);
    };
  }, []);
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
          <span className="ff-adoption-planning-step">QUIZ</span>
          <span className="ff-adoption-planning-row-copy"><strong>입양 환경 점검</strong></span>
          <CompletionBadge title={completions["care-readiness"]} status={status} />
        </Link>
        <Link className={`ff-adoption-planning-row ${styles.row}`} href="/quiz/adoption-prep" onClick={openQuiz}>
          <span className="ff-adoption-planning-step">QUIZ</span>
          <span className="ff-adoption-planning-row-copy"><strong>입양 준비 체크</strong></span>
          <CompletionBadge title={completions["adoption-prep"]} status={status} />
        </Link>
        <button className={`ff-pet-knowledge-trigger ${styles.row}`} type="button" onClick={() => openDetailFlow("/quiz/pet-knowledge")}><span className="ff-adoption-planning-step">QUIZ</span><span className="ff-adoption-planning-row-copy"><strong>상식 퀴즈</strong></span><CompletionBadge title={completions["pet-knowledge"]} status={status} /></button>
      </div>
    </section>
  );
}
