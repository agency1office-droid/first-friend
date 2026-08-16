/* eslint-disable @next/next/no-img-element */
"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { IconXmarkLine } from "@karrotmarket/react-monochrome-icon";
import { optimizedAnimalDetailPreviewUrl, optimizedAnimalImageUrl } from "../../lib/image-url";

function ProgressiveAnimalImage({ src, fullSrc, alt, priority }: { src: string; fullSrc: string; alt: string; priority: boolean }) {
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
    onError={() => {
      if (!thumbnailFailed && displayedSrc === thumbnailSrc) setThumbnailFailed(true);
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
  const [dragOffset, setDragOffset] = useState(0);
  const [dragging, setDragging] = useState(false);
  const dialogRef = useRef<HTMLDialogElement>(null);
  const pointerStart = useRef<{ x: number; y: number } | null>(null);
  const pointerAxis = useRef<"pending" | "horizontal" | "vertical">("pending");
  const suppressClick = useRef(false);
  const active = available[selected] || image;
  const nextImage = available[1] ? optimizedAnimalImageUrl(available[1]) : "";

  function imageSource(src: string) {
    return optimizedAnimalImageUrl(src);
  }

  function handlePointerDown(event: React.PointerEvent<HTMLButtonElement>) {
    pointerStart.current = { x: event.clientX, y: event.clientY };
    pointerAxis.current = "pending";
    suppressClick.current = false;
    setDragging(false);
    setDragOffset(0);
    event.currentTarget.setPointerCapture(event.pointerId);
  }

  function handlePointerMove(event: React.PointerEvent<HTMLButtonElement>) {
    if (pointerStart.current === null || available.length < 2) return;
    const delta = event.clientX - pointerStart.current.x;
    const verticalDelta = event.clientY - pointerStart.current.y;
    if (pointerAxis.current === "pending" && Math.max(Math.abs(delta), Math.abs(verticalDelta)) > 8) {
      pointerAxis.current = Math.abs(delta) > Math.abs(verticalDelta) ? "horizontal" : "vertical";
      if (pointerAxis.current === "vertical") {
        pointerStart.current = null;
        setDragging(false);
        setDragOffset(0);
        return;
      }
      setDragging(true);
    }
    if (pointerAxis.current !== "horizontal") return;
    event.preventDefault();
    if (Math.abs(delta) > 8) suppressClick.current = true;
    setDragOffset(delta);
  }

  function handlePointerUp(event: React.PointerEvent<HTMLButtonElement>) {
    if (pointerStart.current === null) return;
    const delta = event.clientX - pointerStart.current.x;
    pointerStart.current = null;
    const wasHorizontal = pointerAxis.current === "horizontal";
    pointerAxis.current = "pending";
    setDragging(false);
    setDragOffset(0);
    if (wasHorizontal && Math.abs(delta) >= 40 && available.length > 1) {
      suppressClick.current = true;
      setSelected((current) => delta < 0 ? Math.min(current + 1, available.length - 1) : Math.max(current - 1, 0));
    }
  }

  function movePhoto(direction: -1 | 1) {
    if (available.length < 2) return;
    setSelected((current) => Math.max(0, Math.min(current + direction, available.length - 1)));
  }

  function handleKeyDown(event: React.KeyboardEvent<HTMLElement>) {
    if (event.key === "ArrowLeft") {
      event.preventDefault();
      movePhoto(-1);
    } else if (event.key === "ArrowRight") {
      event.preventDefault();
      movePhoto(1);
    }
  }

  useEffect(() => {
    function handlePageKeyDown(event: KeyboardEvent) {
      if (event.key !== "ArrowLeft" && event.key !== "ArrowRight") return;
      const target = event.target as HTMLElement | null;
      if (target?.closest("input, textarea, select")) return;
      event.preventDefault();
      const direction = event.key === "ArrowLeft" ? -1 : 1;
      setSelected((current) => Math.max(0, Math.min(current + direction, available.length - 1)));
    }
    window.addEventListener("keydown", handlePageKeyDown);
    return () => window.removeEventListener("keydown", handlePageKeyDown);
  }, [available.length]);

  function handleClick() {
    if (suppressClick.current) {
      suppressClick.current = false;
      return;
    }
    dialogRef.current?.showModal();
    requestAnimationFrame(() => dialogRef.current?.focus());
  }

  return <div className="ff-gallery">
    {nextImage && <link rel="preload" as="image" href={nextImage} />}
    <button type="button" className="ff-gallery-main" onClick={handleClick} onKeyDown={handleKeyDown} onPointerDown={handlePointerDown} onPointerMove={handlePointerMove} onPointerUp={handlePointerUp} onPointerCancel={handlePointerUp} aria-keyshortcuts="ArrowLeft ArrowRight" aria-label={`${name} 사진 ${selected + 1}번째, 좌우로 움직여 다른 사진 보기`}>
      <span className="ff-gallery-viewport" aria-live="polite">
        <span className="ff-gallery-track" style={{ transform: `translate3d(calc(${selected * -100}% + ${dragOffset}px), 0, 0)`, transition: dragging ? "none" : "transform 220ms ease-out" }}>
          {available.map((src, index) => <span className="ff-gallery-slide" key={src}><ProgressiveAnimalImage src={src} fullSrc={imageSource(src)} alt={`${name}의 공공데이터 등록 사진 ${index + 1}`} priority={index < 2}/></span>)}
        </span>
      </span>
      <span className="ff-gallery-bottom-gradient" aria-hidden="true" />
      <span className="ff-gallery-bottom-meta" aria-hidden="true">
        <strong className="ff-gallery-title">{name}</strong>
        {available.length > 1 && <span className="ff-gallery-count" aria-label={`${selected + 1}/${available.length}`}><span>{selected + 1}</span><span aria-hidden="true">/</span><span>{available.length}</span></span>}
      </span>
    </button>
    <dialog ref={dialogRef} className="ff-image-dialog" tabIndex={-1} onKeyDown={handleKeyDown}>
      <div className="ff-image-dialog-inner">
        <div className="ff-image-dialog-actions"><button type="button" onClick={() => dialogRef.current?.close()} aria-label="원본 사진 닫기"><IconXmarkLine/></button></div>
        <img src={imageSource(active)} alt={name + "의 원본 등록 사진 " + (selected + 1)}/>
        {available.length > 1 && <div className="ff-image-dialog-nav">{available.map((src, index) => <button type="button" key={src} data-active={index === selected} onClick={() => setSelected(index)} aria-label={`${available.length}장 중 ${index + 1}번째 원본 사진 보기`}><img src={imageSource(src)} alt=""/><span>{index + 1}/{available.length}</span></button>)}</div>}
      </div>
    </dialog>
  </div>;
}
