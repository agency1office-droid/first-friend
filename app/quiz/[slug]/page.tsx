import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ReadinessQuiz } from "../../components/ReadinessQuiz";
import { CareReadinessFlow } from "../../components/CareReadinessFlow";
import { getQuizDefinition, getQuizSlugs } from "../../../lib/quiz/registry";

export function generateStaticParams() {
  return getQuizSlugs().map((slug) => ({ slug }));
}

export function generateMetadata({ params }: { params: { slug: string } }): Metadata {
  const definition = getQuizDefinition(params.slug);
  if (!definition) return {};
  return { title: definition.metadata.title, description: definition.metadata.description };
}

export default function QuizPage({ params }: { params: { slug: string } }) {
  const definition = getQuizDefinition(params.slug);
  if (!definition) notFound();
  if (definition.renderer === "care-readiness") return <CareReadinessFlow />;
  if (definition.renderer === "adoption-readiness") return <ReadinessQuiz quizId={definition.slug} />;
  notFound();
}
