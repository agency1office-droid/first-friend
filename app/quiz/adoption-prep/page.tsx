import type { Metadata } from "next";
import { ReadinessQuiz } from "../../components/ReadinessQuiz";
import { getQuizDefinition } from "../../../lib/quiz/registry";
import { getAuthenticatedMember } from "../../chatgpt-auth";

export const metadata: Metadata = { title: "입양 전 준비 확인" };

export default async function AdoptionPreparationQuizPage() {
  const definition = getQuizDefinition("adoption-prep");
  const member = await getAuthenticatedMember();
  const memberName = member?.displayName ?? null, admin = member?.role === "admin";
  return <ReadinessQuiz quizId={definition?.slug ?? "adoption-prep"} memberName={memberName} admin={admin} />;
}
