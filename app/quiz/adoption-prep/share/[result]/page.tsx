import type { Metadata } from "next";
import Image from "next/image";
import { notFound } from "next/navigation";
import { parseReadinessShareResult, getReadinessShareContent } from "../../../../../lib/readiness-share";

type PageProps = { params: Promise<{ result: string }> };

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const result = parseReadinessShareResult((await params).result);
  if (!result) return { title: "입양 전 준비 확인" };
  const content = getReadinessShareContent(result);
  return {
    title: content.title,
    description: `${content.praise} · ${result.correct}/${result.total}`,
    openGraph: {
      title: content.title,
      description: `${content.praise} · ${result.correct}/${result.total}`,
      type: "website",
      images: [{ url: result.correct >= Math.ceil(result.total * 0.8) ? "/readiness-result.webp" : "/readiness-result-failed.webp", width: 224, height: 180 }],
    },
    twitter: {
      card: "summary_large_image",
      title: content.title,
      description: `${content.praise} · ${result.correct}/${result.total}`,
      images: [result.correct >= Math.ceil(result.total * 0.8) ? "/readiness-result.webp" : "/readiness-result-failed.webp"],
    },
    robots: { index: false, follow: false },
  };
}

export default async function ReadinessSharePage({ params }: PageProps) {
  const result = parseReadinessShareResult((await params).result);
  if (!result) notFound();
  const content = getReadinessShareContent(result);
  const passed = result.correct >= Math.ceil(result.total * 0.8);
  return <main className="ff-readiness-share-page"><Image className="ff-readiness-share-illustration" src={passed ? "/readiness-result.webp" : "/readiness-result-failed.webp"} alt="강아지와 고양이 캐릭터" width={224} height={180} priority unoptimized /><h1><span className="ff-readiness-share-count">{content.title}</span></h1><h2>{content.praise}<span> · {result.correct}/{result.total}</span></h2><p>{content.description}</p><a className="ff-readiness-share-cta" href="/quiz/adoption-prep">입양 전 준비 확인 해보기</a></main>;
}
