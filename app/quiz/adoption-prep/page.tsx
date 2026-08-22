import type { Metadata } from "next";
import { ReadinessQuiz } from "../../components/ReadinessQuiz";
import { getQuizDefinition } from "../../../lib/quiz/registry";

export const metadata: Metadata = { title: "입양 전 준비 확인" };

export default function AdoptionPreparationQuizPage() {
  const definition = getQuizDefinition("adoption-prep");
  return <ReadinessQuiz quizId={definition?.slug ?? "adoption-prep"} />;
}
