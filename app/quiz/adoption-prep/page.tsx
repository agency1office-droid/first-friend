import type { Metadata } from "next";
import { ReadinessQuiz } from "../../components/ReadinessQuiz";

export const metadata: Metadata = { title: "입양 전 준비 확인" };

export default function AdoptionPreparationQuizPage() {
  return <ReadinessQuiz />;
}
