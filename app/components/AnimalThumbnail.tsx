"use client";

import { useState } from "react";
import { IconPawprintLine } from "@karrotmarket/react-monochrome-icon";
import { optimizedAnimalImageUrl } from "../../lib/image-url";

// 서버에서 미리 만든 썸네일을 로드하고, 실패하면 원본으로 복구합니다.
/* eslint-disable @next/next/no-img-element */

export function AnimalThumbnail({ src, fallbackSrc, alt, priority = false, onUnavailable }: { src: string; fallbackSrc?: string; alt: string; priority?: boolean; thumbnail?: boolean; onUnavailable?: () => void }) {
  const [failed, setFailed] = useState(false);
  const [retrying, setRetrying] = useState(false);
  if (failed || !src.trim()) return <span className="ff-animal-image ff-animal-image-fallback" role="img" aria-label={`${alt}, 사진 준비 중`}><IconPawprintLine aria-hidden /><small>사진 준비 중</small></span>;
  return <img
    key={retrying ? "retry" : "initial"}
    className="ff-animal-image"
    src={optimizedAnimalImageUrl(retrying && fallbackSrc ? fallbackSrc : src)}
    alt={alt}
    loading={priority ? "eager" : "lazy"}
    decoding="async"
    fetchPriority={priority ? "high" : "auto"}
    referrerPolicy="no-referrer"
    onError={() => {
      if (!retrying) {
        setRetrying(true);
        return;
      }
      setFailed(true);
      onUnavailable?.();
    }}
  />;
}
