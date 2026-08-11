"use client";

import { useState } from "react";
import Image from "next/image";
import { IconPawprintLine } from "@karrotmarket/react-monochrome-icon";

export function AnimalThumbnail({ src, alt }: { src: string; alt: string }) {
  const [failed, setFailed] = useState(false);
  if (failed || !src) return <span className="ff-animal-image ff-animal-image-fallback" role="img" aria-label={`${alt}, 사진 준비 중`}><IconPawprintLine aria-hidden /><small>사진 준비 중</small></span>;
  return <Image className="ff-animal-image" src={src} alt={alt} fill sizes="126px" unoptimized onError={() => setFailed(true)}/>;
}
