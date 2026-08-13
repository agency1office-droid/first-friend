/* eslint-disable @next/next/no-img-element */
"use client";

import { useMemo, useRef, useState } from "react";
import { IconXmarkLine } from "@karrotmarket/react-monochrome-icon";
import { optimizedAnimalImageUrl } from "../../lib/image-url";

export function AnimalGallery({ name, image, images = [] }: { name:string; image:string; images?:string[] }) {
  const available = useMemo(() => Array.from(new Set([image, ...images].filter(Boolean))), [image, images]);
  const [selected, setSelected] = useState(0);
  const dialogRef = useRef<HTMLDialogElement>(null);
  const pointerStart = useRef<number | null>(null);
  const suppressClick = useRef(false);
  const active = available[selected] || image;
  const displayActive = optimizedAnimalImageUrl(active);
  const nextImage = available[1] ? optimizedAnimalImageUrl(available[1]) : "";

  function handlePointerDown(event: React.PointerEvent<HTMLButtonElement>) {
    pointerStart.current = event.clientX;
    suppressClick.current = false;
    event.currentTarget.setPointerCapture(event.pointerId);
  }

  function handlePointerUp(event: React.PointerEvent<HTMLButtonElement>) {
    if (pointerStart.current === null) return;
    const delta = event.clientX - pointerStart.current;
    pointerStart.current = null;
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
    <button type="button" className="ff-gallery-main" onClick={handleClick} onPointerDown={handlePointerDown} onPointerUp={handlePointerUp} aria-label={`${name} 사진 ${selected + 1}번째, 좌우로 움직여 다른 사진 보기`}>
      <img className="ff-detail-image" src={displayActive} alt={`${name}의 공공데이터 등록 사진 ${selected + 1}`} fetchPriority="high" decoding="async" referrerPolicy="no-referrer" draggable="false"/>
      {available.length > 1 && <span className="ff-gallery-count">{selected + 1}/{available.length}</span>}
    </button>
    <dialog ref={dialogRef} className="ff-image-dialog">
      <div className="ff-image-dialog-inner">
        <div className="ff-image-dialog-actions"><button type="button" onClick={() => dialogRef.current?.close()} aria-label="원본 사진 닫기"><IconXmarkLine/></button></div>
        <img src={displayActive} alt={`${name}의 원본 등록 사진 ${selected + 1}`}/>
        {available.length > 1 && <div className="ff-image-dialog-nav">{available.map((src, index) => <button type="button" key={src} data-active={index === selected} onClick={() => setSelected(index)} aria-label={`${available.length}장 중 ${index + 1}번째 원본 사진 보기`}><img src={optimizedAnimalImageUrl(src)} alt=""/><span>{index + 1}/{available.length}</span></button>)}</div>}
      </div>
    </dialog>
  </div>;
}
