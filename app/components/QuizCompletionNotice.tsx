"use client";

import { useSyncExternalStore } from "react";
import { ActionButton } from "seed-design/ui/action-button";
import { readSaveState, retryQuizCompletion, subscribeQuizCompletion, type CompletionQuiz } from "../../lib/quiz-completion";

export function QuizCompletionNotice({ quiz, quietSuccess = false, preview = false }: { quiz: CompletionQuiz; quietSuccess?: boolean; preview?: boolean }) {
  const state = useSyncExternalStore(subscribeQuizCompletion, () => readSaveState(quiz), () => "idle");
  if (preview) return <div role="status"><p>미리보기 결과는 저장되지 않아요. 퀴즈를 완료하면 회원정보에 기록돼요.</p></div>;
  if (state === "idle" || state === "login" || (quietSuccess && (state === "saved" || state === "saving" || state === "kept"))) return null;
  return <div role="status">
    <p>{state === "saving" ? "결과 카드를 저장하고 있어요." : state === "saved" ? "나의 페이지에 최고 결과 카드를 저장했어요." : state === 'kept' ? '나의 페이지에는 기존 최고 기록을 유지했어요.' : "수료 기록을 저장하지 못했어요. 다시 저장해 주세요."}</p>
    {state === "error" && <ActionButton size="small" variant="neutralWeak" onClick={() => retryQuizCompletion(quiz)}>다시 저장하기</ActionButton>}
  </div>;
}
