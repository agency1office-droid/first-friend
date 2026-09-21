"use client";

import { useSyncExternalStore } from "react";
import { ActionButton } from "seed-design/ui/action-button";
import { readSaveState, retryQuizCompletion, subscribeQuizCompletion, type CompletionQuiz } from "../../lib/quiz-completion";

export function QuizCompletionNotice({ quiz, quietSuccess = false }: { quiz: CompletionQuiz; quietSuccess?: boolean }) {
  const state = useSyncExternalStore(subscribeQuizCompletion, () => readSaveState(quiz), () => "idle");
  if (state === "idle" || (quietSuccess && (state === "saved" || state === "saving"))) return null;
  return <div role="status">
    <p>{state === "saving" ? "회원정보에 수료 기록을 저장하고 있어요." : state === "saved" ? "회원정보에 저장했어요. 다른 기기에서도 같은 계정으로 확인할 수 있어요." : state === "login" ? "로그인 후 퀴즈를 완료하면 회원정보에 기록이 저장돼요." : "수료 기록을 저장하지 못했어요. 다시 저장해 주세요."}</p>
    {state === "error" && <ActionButton size="small" variant="neutralWeak" onClick={() => retryQuizCompletion(quiz)}>다시 저장하기</ActionButton>}
    {state === "login" && <ActionButton size="small" variant="neutralWeak" asChild><a href={`/login?return_to=${encodeURIComponent(`/quiz/${quiz}`)}`}>로그인하기</a></ActionButton>}
  </div>;
}
