"use client";

import { useEffect, useState, type MouseEvent } from "react";
import Link from "next/link";
import { Badge } from "seed-design/ui/badge";
import { quizCompletionUpdatedEvent, type CompletionQuiz } from "../../lib/quiz-completion";
import { readDisplayScope } from "./display-scope";
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
    let controller: AbortController | undefined;
    let scope = readDisplayScope();
    let loaded = false;
    let checkedAt = 0;
    async function refresh(force = false) {
      const nextScope = readDisplayScope();
      if (scope !== nextScope) {
        scope = nextScope;
        loaded = false;
        checkedAt = 0;
        controller?.abort();
        controller = undefined;
        setCompletions({});
        setStatus("확인 중");
      }
      if (!force && (controller || (loaded && Date.now() - checkedAt < 30_000))) return;
      controller?.abort();
      const request = new AbortController();
      controller = request;
      const { signal } = request;
      const requestScope = scope;
      try {
        const response = await fetch("/api/quiz-completions", { cache: "no-store", credentials: "same-origin", signal });
        if (!response.ok && response.status !== 401) throw new Error("load_failed");
        const body = response.status === 401 ? { completions: {} } : await response.json();
        if (!active || signal.aborted) return;
        if (requestScope !== readDisplayScope()) { void refresh(true); return; }
        loaded = true;
        checkedAt = Date.now();
        setCompletions(previous => {
          const next = body.completions as Partial<Record<CompletionQuiz, string>>;
          return Object.keys(previous).length === Object.keys(next).length && Object.entries(next).every(([key, value]) => previous[key as CompletionQuiz] === value) ? previous : next;
        });
        setStatus("도전하기");
      } catch {
        if (active && !signal.aborted) {
          if (requestScope !== readDisplayScope()) { void refresh(true); return; }
          if (!loaded) setStatus("확인 필요");
        }
      } finally {
        if (controller === request) controller = undefined;
      }
    }
    void refresh();
    const update = () => { void refresh(); };
    const completed = () => { void refresh(true); };
    const storage = (event: StorageEvent) => { if (event.key === quizCompletionUpdatedEvent) completed(); };
    const visible = () => { if (document.visibilityState === "visible") update(); };
    window.addEventListener("focus", update);
    window.addEventListener("pageshow", update);
    window.addEventListener("storage", storage);
    window.addEventListener(quizCompletionUpdatedEvent, completed);
    document.addEventListener("visibilitychange", visible);
    return () => {
      active = false;
      controller?.abort();
      window.removeEventListener("focus", update);
      window.removeEventListener("pageshow", update);
      window.removeEventListener("storage", storage);
      window.removeEventListener(quizCompletionUpdatedEvent, completed);
      document.removeEventListener("visibilitychange", visible);
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
