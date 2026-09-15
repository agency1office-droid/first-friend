import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ReadinessQuiz } from "../../components/ReadinessQuiz";
import { CareReadinessFlow } from "../../components/CareReadinessFlow";
import { getQuizDefinition, getQuizSlugs } from "../../../lib/quiz/registry";
import { getAuthenticatedMember } from "../../chatgpt-auth";

export function generateStaticParams() {
  return getQuizSlugs().map((slug) => ({ slug }));
}

export function generateMetadata({ params }: { params: { slug: string } }): Metadata {
  const definition = getQuizDefinition(params.slug);
  if (!definition) return {};
  return { title: definition.metadata.title, description: definition.metadata.description };
}

export default async function QuizPage({ params }: { params: { slug: string } }) {
  const definition = getQuizDefinition(params.slug);
  if (!definition) notFound();
  // 로그인한 회원이면 인증서 카드에 이름을 넣습니다. 쿠키가 없으면 DB를 읽지 않습니다.
  const memberName = (await getAuthenticatedMember())?.displayName ?? null;
  if (definition.renderer === "care-readiness") return <CareReadinessFlow memberName={memberName} />;
  if (definition.renderer === "adoption-readiness") return <ReadinessQuiz quizId={definition.slug} memberName={memberName} />;
  notFound();
}
