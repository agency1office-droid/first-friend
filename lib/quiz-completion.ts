export type CompletionQuiz = "care-readiness" | "adoption-prep" | "pet-knowledge";

const prefix = "ff-quiz-completion-v1:";
export const quizCompletionEvent = "ff-quiz-completion";

export function completionTitle(ratio: number, title: string) {
  const rank = ratio >= 1 ? "상위 1%" : ratio >= 0.8 ? "상위 10%" : "상위 50%";
  return `${rank} · ${title}`;
}

export function saveQuizCompletion(quiz: CompletionQuiz, ratio: number, title: string) {
  if (!Number.isFinite(ratio) || ratio < 0 || ratio > 1 || !title || title.length > 80) return;
  try {
    window.localStorage.setItem(prefix + quiz, JSON.stringify({ ratio, title }));
    window.dispatchEvent(new Event(quizCompletionEvent));
  } catch {
    // 저장을 차단한 브라우저에서도 퀴즈 결과 화면은 사용할 수 있어요.
  }
}

export function readQuizCompletion(quiz: CompletionQuiz) {
  try {
    const result = JSON.parse(window.localStorage.getItem(prefix + quiz) ?? "null");
    if (result && Number.isFinite(result.ratio) && result.ratio >= 0 && result.ratio <= 1
      && typeof result.title === "string" && result.title.length > 0 && result.title.length <= 80) {
      return completionTitle(result.ratio, result.title);
    }
  } catch {
    // 오래되거나 손상된 기록은 미수료로 표시해요.
  }
  return "미수료";
}

export function subscribeQuizCompletion(update: () => void) {
  window.addEventListener("storage", update);
  window.addEventListener("pageshow", update);
  window.addEventListener(quizCompletionEvent, update);
  return () => {
    window.removeEventListener("storage", update);
    window.removeEventListener("pageshow", update);
    window.removeEventListener(quizCompletionEvent, update);
  };
}
