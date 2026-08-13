"use client";

import { useState } from "react";
import Image from "next/image";
import { IconPawprintLine } from "@karrotmarket/react-monochrome-icon";

export function AnimalThumbnail({ src, alt, priority = false }: { src: string; alt: string; priority?: boolean }) {
  const [failed, setFailed] = useState(false);
  const [fallback, setFallback] = useState(false);
  if (failed || !src) return <span className="ff-animal-image ff-animal-image-fallback" role="img" aria-label={`${alt}, 사진 준비 중`}><IconPawprintLine aria-hidden /><small>사진 준비 중</small></span>;
  const directSrc = src;
  const proxySrc = `/api/media?url=${encodeURIComponent(src)}`;
  return <Image
    className="ff-animal-image"
    src={fallback ? proxySrc : directSrc}
    alt={alt}
    fill
    sizes="(max-width: 640px) 50vw, 126px"
    priority={priority}
    unoptimized
    loader={({ src: imageSrc }) => imageSrc}
    onError={() => fallback ? setFailed(true) : setFallback(true)}
  />;
}
