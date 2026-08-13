"use client";

import { useState } from "react";
import { IconPawprintLine } from "@karrotmarket/react-monochrome-icon";
import { optimizedAnimalImageUrl, optimizedAnimalThumbnailUrl } from "../../lib/image-url";

// 공공 API 이미지 주소를 브라우저가 직접 로드하므로 next/image 대신
// 브라우저의 lazy loading을 사용합니다.
/* eslint-disable @next/next/no-img-element */

export function AnimalThumbnail({ src, alt, priority = false, thumbnail = false }: { src: string; alt: string; priority?: boolean; thumbnail?: boolean }) {
  const [failed, setFailed] = useState(false);
  const [fallback, setFallback] = useState(false);
  if (failed || !src) return <span className="ff-animal-image ff-animal-image-fallback" role="img" aria-label={`${alt}, 사진 준비 중`}><IconPawprintLine aria-hidden /><small>사진 준비 중</small></span>;
  const directSrc = src;
  const proxySrc = thumbnail ? optimizedAnimalThumbnailUrl(src) : optimizedAnimalImageUrl(src);
  const initialSrc = proxySrc === src ? directSrc : proxySrc;
  return <img
    className="ff-animal-image"
    src={fallback ? (thumbnail ? optimizedAnimalImageUrl(src) : (initialSrc === directSrc ? proxySrc : directSrc)) : initialSrc}
    alt={alt}
    loading={priority ? "eager" : "lazy"}
    decoding="async"
    fetchPriority={priority ? "high" : "auto"}
    referrerPolicy="no-referrer"
    onError={() => fallback ? setFailed(true) : setFallback(true)}
  />;
}
