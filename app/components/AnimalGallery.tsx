/* eslint-disable @next/next/no-img-element */
"use client";

import { useMemo, useRef, useState } from "react";
import { IconArrowUpRightLine, IconPictureLine, IconXmarkLine } from "@karrotmarket/react-monochrome-icon";
import { optimizedAnimalImageUrl } from "../../lib/image-url";

export function AnimalGallery({ name, image, images = [] }: { name:string; image:string; images?:string[] }) {
  const available = useMemo(() => Array.from(new Set([image, ...images].filter(Boolean))), [image, images]);
  const [selected, setSelected] = useState(0);
  const dialogRef = useRef<HTMLDialogElement>(null);
  const active = available[selected] || image;
  const displayActive = optimizedAnimalImageUrl(active);

  return <div className="ff-gallery">
    <button type="button" className="ff-gallery-main" onClick={() => dialogRef.current?.showModal()} aria-label={`${name} 사진 원본 크기로 보기`}>
      <img className="ff-detail-image" src={displayActive} alt={`${name}의 공공데이터 등록 사진 ${selected + 1}`}/>
      <span className="ff-gallery-expand"><IconArrowUpRightLine/>원본 보기</span>
      {available.length > 1 && <span className="ff-gallery-count"><IconPictureLine/>사진 {available.length}장 · {selected + 1}/{available.length}</span>}
    </button>
    {available.length > 1 && <div className="ff-gallery-thumbs" aria-label={`${name}의 다른 사진`}>
      {available.map((src, index) => <button type="button" key={src} data-active={index === selected} onClick={() => setSelected(index)} aria-label={`${available.length}장 중 ${index + 1}번째 사진 보기`} aria-pressed={index === selected}><img src={optimizedAnimalImageUrl(src)} alt="" loading={index < 2 ? "eager" : "lazy"}/><span>{index + 1}/{available.length}</span></button>)}
    </div>}
    <dialog ref={dialogRef} className="ff-image-dialog">
      <div className="ff-image-dialog-inner">
        <div className="ff-image-dialog-actions"><a href={active} target="_blank" rel="noreferrer"><IconArrowUpRightLine/>새 탭에서 원본 열기</a><button type="button" onClick={() => dialogRef.current?.close()} aria-label="원본 사진 닫기"><IconXmarkLine/></button></div>
        <img src={displayActive} alt={`${name}의 원본 등록 사진 ${selected + 1}`}/>
        {available.length > 1 && <div className="ff-image-dialog-nav">{available.map((src, index) => <button type="button" key={src} data-active={index === selected} onClick={() => setSelected(index)} aria-label={`${available.length}장 중 ${index + 1}번째 원본 사진 보기`}><img src={optimizedAnimalImageUrl(src)} alt=""/><span>{index + 1}/{available.length}</span></button>)}</div>}
      </div>
    </dialog>
  </div>;
}
