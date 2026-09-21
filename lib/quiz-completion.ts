import { rememberPending, forgetPending } from './pending-results';
import type { CareAnswers } from './care-readiness';
export type CompletionQuiz = "care-readiness" | "adoption-prep" | "pet-knowledge";
export const quizCompletionEvent = "ff-quiz-completion";
export const quizCompletionUpdatedEvent = "ff-quiz-completion-updated";
export type SaveState = "idle" | "saving" | "saved" | "kept" | "login" | "error";
type Details = { answers?: CareAnswers; species?: 'cat' | 'dog'; completedAt?: string };
const saves = new Map<CompletionQuiz, { ratio: number; title: string; details: Details; state: SaveState }>();

export function readSaveState(quiz: CompletionQuiz): SaveState {
  return saves.get(quiz)?.state ?? "idle";
}

export async function saveQuizCompletion(quiz: CompletionQuiz, ratio: number, title: string, details: Details = {}) {
  if (!Number.isFinite(ratio) || ratio < 0 || ratio > 1 || !title || title.length > 80) return;
  const current = { ratio, title, details: { ...details, completedAt: details.completedAt ?? new Date().toISOString() }, state: "saving" as SaveState };
  const body = { quiz, ratio, title, ...current.details };
  const pendingId = `${quiz}:${current.details.completedAt}`;
  saves.set(quiz, current);
  const notify = () => window.dispatchEvent(new Event(quizCompletionEvent));
  notify();
  try {
    const response = await fetch("/api/quiz-completions", {
      method: "POST", headers: { "content-type": "application/json" },
      body: JSON.stringify(body), credentials: "same-origin", cache: "no-store", keepalive: true,
    });
    current.state = response.ok ? "saved" : response.status === 401 ? "login" : "error";
    if (response.status === 401 && !rememberPending({ id: pendingId, endpoint: '/api/quiz-completions', body })) current.state = 'error';
    if (response.ok) {
      forgetPending(pendingId);
      const saved = await response.json();
      if (saved.updated === false) current.state = 'kept';
      window.dispatchEvent(new Event(quizCompletionUpdatedEvent));
      // 다른 탭에는 재조회 신호만 보내며 결과나 회원정보는 저장하지 않습니다.
      try { window.localStorage.setItem(quizCompletionUpdatedEvent, String(Date.now())); } catch { /* focus 시 재조회 */ }
    }
  } catch {
    current.state = "error";
  }
  if (saves.get(quiz) === current) notify();
}

export function retryQuizCompletion(quiz: CompletionQuiz) {
  const result = saves.get(quiz);
  if (result) void saveQuizCompletion(quiz, result.ratio, result.title, result.details);
}

export function subscribeQuizCompletion(update: () => void) {
  window.addEventListener(quizCompletionEvent, update);
  return () => window.removeEventListener(quizCompletionEvent, update);
}
