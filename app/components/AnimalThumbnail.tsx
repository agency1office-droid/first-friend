"use client";

import { useState } from "react";
import { IconPawprintLine } from "@karrotmarket/react-monochrome-icon";
import { optimizedAnimalImageUrl } from "../../lib/image-url";

// 공공 API 이미지 주소를 브라우저가 직접 로드하므로 next/image 대신
// 브라우저의 lazy loading을 사용합니다.
/* eslint-disable @next/next/no-img-element */

export function AnimalThumbnail({ src, alt, priority = false, onUnavailable }: { src: string; alt: string; priority?: boolean; thumbnail?: boolean; onUnavailable?: () => void }) {
  const [failed, setFailed] = useState(false);
  const [retrying, setRetrying] = useState(false);
  if (failed || !src.trim()) return <span className="ff-animal-image ff-animal-image-fallback" role="img" aria-label={`${alt}, 사진 준비 중`}><IconPawprintLine aria-hidden /><small>사진 준비 중</small></span>;
  return <img
    key={retrying ? "retry" : "initial"}
    className="ff-animal-image"
    src={optimizedAnimalImageUrl(src)}
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
