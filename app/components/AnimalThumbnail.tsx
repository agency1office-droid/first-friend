"use client";

import { useState } from "react";
import { IconPawprintLine } from "@karrotmarket/react-monochrome-icon";

export function AnimalThumbnail({ src, alt, priority = false }: { src: string; alt: string; priority?: boolean }) {
  const [failed, setFailed] = useState(false);
  const [fallback, setFallback] = useState(false);
  if (failed || !src) return <span className="ff-animal-image ff-animal-image-fallback" role="img" aria-label={`${alt}, 사진 준비 중`}><IconPawprintLine aria-hidden /><small>사진 준비 중</small></span>;
  const directSrc = src;
  const proxySrc = `/api/media?url=${encodeURIComponent(src)}`;
  return <img
    className="ff-animal-image"
    src={fallback ? proxySrc : directSrc}
    alt={alt}
    loading={priority ? "eager" : "lazy"}
    decoding="async"
    fetchPriority={priority ? "high" : "auto"}
    onError={() => fallback ? setFailed(true) : setFallback(true)}
  />;
}
