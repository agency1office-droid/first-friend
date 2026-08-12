"use client";

import { useState } from "react";
import Image from "next/image";
import { IconPawprintLine } from "@karrotmarket/react-monochrome-icon";

export function AnimalThumbnail({ src, alt }: { src: string; alt: string }) {
  const [failed, setFailed] = useState(false);
  if (failed || !src) return <span className="ff-animal-image ff-animal-image-fallback" role="img" aria-label={`${alt}, 사진 준비 중`}><IconPawprintLine aria-hidden /><small>사진 준비 중</small></span>;
  const optimizedSrc = src.startsWith("https://openapi.animal.go.kr/") ? `/api/media/animal-thumbnail?url=${encodeURIComponent(src)}` : src;
  return <Image className="ff-animal-image" src={optimizedSrc} alt={alt} fill sizes="126px" onError={() => setFailed(true)}/>;
}
