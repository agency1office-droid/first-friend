export type CompletionQuiz = "care-readiness" | "adoption-prep" | "pet-knowledge";
export const quizCompletionEvent = "ff-quiz-completion";
export type SaveState = "idle" | "saving" | "saved" | "login" | "error";
const saves = new Map<CompletionQuiz, { ratio: number; title: string; state: SaveState }>();

export function readSaveState(quiz: CompletionQuiz): SaveState {
  return saves.get(quiz)?.state ?? "idle";
}

export async function saveQuizCompletion(quiz: CompletionQuiz, ratio: number, title: string) {
  if (!Number.isFinite(ratio) || ratio < 0 || ratio > 1 || !title || title.length > 80) return;
  const current = { ratio, title, state: "saving" as SaveState };
  saves.set(quiz, current);
  const notify = () => window.dispatchEvent(new Event(quizCompletionEvent));
  notify();
  try {
    const response = await fetch("/api/quiz-completions", {
      method: "POST", headers: { "content-type": "application/json" },
      body: JSON.stringify({ quiz, ratio, title }), credentials: "same-origin", cache: "no-store", keepalive: true,
    });
    current.state = response.ok ? "saved" : response.status === 401 ? "login" : "error";
    if (response.ok) {
      // 다른 탭에는再조회 신호만 보내며 결과나 회원정보는 저장하지 않습니다.
      try { window.localStorage.setItem("ff-quiz-completion-updated", String(Date.now())); } catch { /* focus 시 재조회 */ }
    }
  } catch {
    current.state = "error";
  }
  if (saves.get(quiz) === current) notify();
}

export function retryQuizCompletion(quiz: CompletionQuiz) {
  const result = saves.get(quiz);
  if (result) void saveQuizCompletion(quiz, result.ratio, result.title);
}

export function subscribeQuizCompletion(update: () => void) {
  window.addEventListener(quizCompletionEvent, update);
  return () => window.removeEventListener(quizCompletionEvent, update);
}
