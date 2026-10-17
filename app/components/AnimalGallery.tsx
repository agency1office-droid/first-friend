/* eslint-disable @next/next/no-img-element */
"use client";

import { useEffect, useId, useMemo, useRef, useState } from "react";
import { ActionButton } from "seed-design/ui/action-button";
import { IconXmarkLine } from "@karrotmarket/react-monochrome-icon";
import { optimizedAnimalDetailPreviewUrl, optimizedAnimalImageUrl } from "../../lib/image-url";

function ProgressiveAnimalImage({ src, fullSrc, alt, priority }: { src: string; fullSrc: string; alt: string; priority: boolean }) {
  const thumbnailSrc = optimizedAnimalDetailPreviewUrl(src);
  const [thumbnailFailed, setThumbnailFailed] = useState(false);

  const displayedSrc = thumbnailFailed ? fullSrc : thumbnailSrc;
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
  const galleryId = useId();
  const available = useMemo(() => Array.from(new Set([image, ...images].filter(Boolean))), [image, images]);
  const [selected, setSelected] = useState(0);
  const [dragOffset, setDragOffset] = useState(0);
  const [dragging, setDragging] = useState(false);
  const [viewerOpen, setViewerOpen] = useState(false);
  const dialogRef = useRef<HTMLDialogElement>(null);
  const pointerStart = useRef<{ x: number; y: number } | null>(null);
  const pointerAxis = useRef<"pending" | "horizontal" | "vertical">("pending");
  const suppressClick = useRef(false);
  const active = available[selected] || image;

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
    if (viewerOpen) dialogRef.current?.showModal();
  }, [viewerOpen]);

  function handleClick() {
    if (suppressClick.current) {
      suppressClick.current = false;
      return;
    }
    setViewerOpen(true);
  }

  return <div className="ff-gallery">
    <button type="button" className="ff-gallery-main" onClick={handleClick} onKeyDown={handleKeyDown} onPointerDown={handlePointerDown} onPointerMove={handlePointerMove} onPointerUp={handlePointerUp} onPointerCancel={handlePointerUp} aria-keyshortcuts="ArrowLeft ArrowRight" aria-labelledby={`${galleryId}-label`} aria-describedby={`${galleryId}-help`}>
      <span className="ff-gallery-viewport" aria-live="polite">
        <span className="ff-gallery-track" style={{ transform: `translate3d(calc(${selected * -100}% + ${dragOffset}px), 0, 0)`, transition: dragging ? "none" : "transform 220ms ease-out" }}>
          {available.map((src, index) => <span className="ff-gallery-slide" key={src}>{Math.abs(index - selected) <= 1 && <ProgressiveAnimalImage src={src} fullSrc={imageSource(src)} alt={`${name}의 공공데이터 등록 사진 ${index + 1}`} priority={index === selected}/>}</span>)}
        </span>
      </span>
      <span className="ff-gallery-bottom-gradient" aria-hidden="true" />
      <span className="ff-gallery-bottom-meta" id={`${galleryId}-label`}>
        <strong className="ff-gallery-title">{name}</strong>
        <span className="ff-gallery-count" aria-label={`${selected + 1}/${available.length}`}><span>{selected + 1}</span><span aria-hidden="true">/</span><span>{available.length}</span></span>
      </span>
    </button>
    <span id={`${galleryId}-help`} className="ff-visually-hidden">사진 크게 보기, 좌우로 움직여 다른 사진 보기</span>
    {available.length > 1 && <div className="ff-gallery-controls" aria-label="사진 이동"><ActionButton size="small" variant="neutralWeak" disabled={selected === 0} onClick={() => movePhoto(-1)}>이전 사진</ActionButton><span aria-live="polite">{selected + 1} / {available.length}</span><ActionButton size="small" variant="neutralWeak" disabled={selected === available.length - 1} onClick={() => movePhoto(1)}>다음 사진</ActionButton></div>}
    <dialog ref={dialogRef} className="ff-image-dialog" tabIndex={-1} aria-label={`${name} 원본 사진`} onClose={() => setViewerOpen(false)} onKeyDown={handleKeyDown}>
      {viewerOpen && <div className="ff-image-dialog-inner">
        <div className="ff-image-dialog-actions"><button type="button" onClick={() => dialogRef.current?.close()} aria-label="원본 사진 닫기"><IconXmarkLine/></button></div>
        <img src={imageSource(active)} alt={name + "의 원본 등록 사진 " + (selected + 1)}/>
        {available.length > 1 && <div className="ff-image-dialog-nav">{available.map((src, index) => <button type="button" key={src} data-active={index === selected} onClick={() => setSelected(index)} aria-label={`${available.length}장 중 ${index + 1}번째 원본 사진 보기`}><img src={imageSource(src)} alt=""/><span>{index + 1}/{available.length}</span></button>)}</div>}
      </div>}
    </dialog>
  </div>;
}
