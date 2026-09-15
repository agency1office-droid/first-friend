import type { Metadata } from "next";
import { ReadinessQuiz } from "../../components/ReadinessQuiz";
import { getQuizDefinition } from "../../../lib/quiz/registry";
import { getAuthenticatedMember } from "../../chatgpt-auth";

export const metadata: Metadata = { title: "입양 전 준비 확인" };

export default async function AdoptionPreparationQuizPage() {
  const definition = getQuizDefinition("adoption-prep");
  const memberName = (await getAuthenticatedMember())?.displayName ?? null;
  return <ReadinessQuiz quizId={definition?.slug ?? "adoption-prep"} memberName={memberName} />;
}
