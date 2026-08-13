/* eslint-disable @next/next/no-img-element */
"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { IconXmarkLine } from "@karrotmarket/react-monochrome-icon";
import { optimizedAnimalDetailPreviewUrl, optimizedAnimalImageUrl } from "../../lib/image-url";

function ProgressiveAnimalImage({ src, fullSrc, alt, priority, onFullError }: { src: string; fullSrc: string; alt: string; priority: boolean; onFullError: (currentSrc: string) => void }) {
  const thumbnailSrc = optimizedAnimalDetailPreviewUrl(src);
  const [fullReady, setFullReady] = useState(thumbnailSrc === fullSrc);
  const [thumbnailFailed, setThumbnailFailed] = useState(false);

  useEffect(() => {
    if (thumbnailSrc === fullSrc) return;
    const preload = new Image();
    preload.decoding = "async";
    preload.onload = () => setFullReady(true);
    preload.src = fullSrc;
  }, [fullSrc, thumbnailSrc]);

  const displayedSrc = thumbnailFailed ? fullSrc : fullReady ? fullSrc : thumbnailSrc;
  return <img
    className="ff-detail-image"
    src={displayedSrc}
    onError={(event) => {
      if (!thumbnailFailed && displayedSrc === thumbnailSrc) setThumbnailFailed(true);
      else onFullError(event.currentTarget.currentSrc);
    }}
    alt={alt}
    fetchPriority={priority ? "high" : "auto"}
    loading={priority ? "eager" : "lazy"}
    decoding="async"
    referrerPolicy="no-referrer"
    draggable="false"
  />;
}

export function AnimalGallery({ name, image, images = [] }: { name:string; image:string; images?:string[] }) {
  const available = useMemo(() => Array.from(new Set([image, ...images].filter(Boolean))), [image, images]);
  const [selected, setSelected] = useState(0);
  const [fallbackSources, setFallbackSources] = useState<Record<string, string>>({});
  const [dragOffset, setDragOffset] = useState(0);
  const [dragging, setDragging] = useState(false);
  const dialogRef = useRef<HTMLDialogElement>(null);
  const pointerStart = useRef<number | null>(null);
  const suppressClick = useRef(false);
  const active = available[selected] || image;
  const nextImage = available[1] ? optimizedAnimalImageUrl(available[1]) : "";

  function imageSource(src: string) {
    return fallbackSources[src] || optimizedAnimalImageUrl(src);
  }

  function handleImageError(src: string, currentSrc: string) {
    // The public API occasionally times out when requested through our proxy,
    // while the same image is still available from the source host. Retry the
    // browser request directly before showing a broken-image state.
    if (currentSrc.includes("/api/media?url=") && !fallbackSources[src]) {
      setFallbackSources((current) => ({ ...current, [src]: src.replace(/^http:\/\//i, "https://") }));
    }
  }

  function handlePointerDown(event: React.PointerEvent<HTMLButtonElement>) {
    pointerStart.current = event.clientX;
    suppressClick.current = false;
    setDragging(true);
    setDragOffset(0);
    event.currentTarget.setPointerCapture(event.pointerId);
  }

  function handlePointerMove(event: React.PointerEvent<HTMLButtonElement>) {
    if (pointerStart.current === null || available.length < 2) return;
    const delta = event.clientX - pointerStart.current;
    if (Math.abs(delta) > 8) suppressClick.current = true;
    setDragOffset(delta);
  }

  function handlePointerUp(event: React.PointerEvent<HTMLButtonElement>) {
    if (pointerStart.current === null) return;
    const delta = event.clientX - pointerStart.current;
    pointerStart.current = null;
    setDragging(false);
    setDragOffset(0);
    if (Math.abs(delta) >= 40 && available.length > 1) {
      suppressClick.current = true;
      setSelected((current) => delta < 0 ? Math.min(current + 1, available.length - 1) : Math.max(current - 1, 0));
    }
  }

  function handleClick() {
    if (suppressClick.current) {
      suppressClick.current = false;
      return;
    }
    dialogRef.current?.showModal();
  }

  return <div className="ff-gallery">
    {nextImage && <link rel="preload" as="image" href={nextImage} />}
    <button type="button" className="ff-gallery-main" onClick={handleClick} onPointerDown={handlePointerDown} onPointerMove={handlePointerMove} onPointerUp={handlePointerUp} onPointerCancel={handlePointerUp} aria-label={`${name} 사진 ${selected + 1}번째, 좌우로 움직여 다른 사진 보기`}>
      <span className="ff-gallery-viewport" aria-live="polite">
        <span className="ff-gallery-track" style={{ transform: `translate3d(calc(${selected * -100}% + ${dragOffset}px), 0, 0)`, transition: dragging ? "none" : "transform 220ms ease-out" }}>
          {available.map((src, index) => <span className="ff-gallery-slide" key={src}><ProgressiveAnimalImage src={src} fullSrc={imageSource(src)} onFullError={(currentSrc) => handleImageError(src, currentSrc)} alt={`${name}의 공공데이터 등록 사진 ${index + 1}`} priority={index < 2}/></span>)}
        </span>
      </span>
      {available.length > 1 && <span className="ff-gallery-count">{selected + 1}/{available.length}</span>}
    </button>
    <dialog ref={dialogRef} className="ff-image-dialog">
      <div className="ff-image-dialog-inner">
        <div className="ff-image-dialog-actions"><button type="button" onClick={() => dialogRef.current?.close()} aria-label="원본 사진 닫기"><IconXmarkLine/></button></div>
        <img src={imageSource(active)} onError={(event) => handleImageError(active, event.currentTarget.currentSrc)} alt={`${name}의 원본 등록 사진 ${selected + 1}`}/>
        {available.length > 1 && <div className="ff-image-dialog-nav">{available.map((src, index) => <button type="button" key={src} data-active={index === selected} onClick={() => setSelected(index)} aria-label={`${available.length}장 중 ${index + 1}번째 원본 사진 보기`}><img src={imageSource(src)} onError={(event) => handleImageError(src, event.currentTarget.currentSrc)} alt=""/><span>{index + 1}/{available.length}</span></button>)}</div>}
      </div>
    </dialog>
  </div>;
}
