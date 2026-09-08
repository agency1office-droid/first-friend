"use client";

import Link from "next/link";

import { useState } from "react";
import type { Animal } from "../../lib/data";
import { FavoriteButton } from "./FavoriteButton";
import { IconPicture2StackedLine } from "@karrotmarket/react-monochrome-icon";
import { formatDistance } from "../../lib/geo";
import { getAnimalPublicStatus, getNoticeDaysRemaining } from "../../lib/animal-public-status";
import { Badge } from "seed-design/ui/badge";
import { AnimalThumbnail } from "./AnimalThumbnail";
import { DialogRoot, DialogContent, DialogFooter } from "seed-design/ui/dialog";
import { ActionButton } from "seed-design/ui/action-button";
import { Portal } from "@seed-design/react-portal";

function compactRegion(region: string) {
  const parts = region.trim().split(/\s+/);
  if (parts.length < 2) return region;
  if (/^(서울특별시|부산광역시|대구광역시|인천광역시|광주광역시|대전광역시|울산광역시|세종특별자치시|경기도|강원특별자치도|충청북도|충청남도|전북특별자치도|전라남도|경상북도|경상남도|제주특별자치도)$/.test(parts[0])) return parts.slice(1).join(" ");
  return region;
}

function displayAge(age: string) {
  if (age.includes("60일미만")) return "60일 미만";
  return age.replace(/^(\d{4})(?:\([^)]*\))*\(년생\)$/, "$1년생").replace(/^(\d{4})\(년생\)$/, "$1년생");
}

export function AnimalCard({ animal,layout="grid",initialSaved,onFavoriteChange,showShelter=true,priority=false }: { animal: Animal;layout?:"grid"|"row"|"photo";initialSaved?:boolean;onFavoriteChange?:(saved:boolean)=>void;showShelter?:boolean;priority?:boolean }) {
  const [imageUnavailable, setImageUnavailable] = useState(false);
  const [removeScrap, setRemoveScrap] = useState<(() => Promise<void>) | null>(null);
  const publicStatus = getAnimalPublicStatus(animal);
  const animalHref = `/friends/${animal.id}`;
  const shelterHref = animal.shelterId ? `/shelters/${encodeURIComponent(animal.shelterId)}` : "/shelters";
  if (imageUnavailable || !animal.image.trim()) return null;
  if (layout === "photo") return <article className="ff-animal-card ff-animal-card-photo">
    <Link prefetch={false} className="ff-animal-photo-link" href={animalHref} aria-label={`${animal.name}, ${publicStatus.cardLabel}, 상세 보기`}>
      <div className="ff-animal-image-wrap">
        <AnimalThumbnail key={animal.thumbnail || animal.image} src={animal.thumbnail || animal.image} fallbackSrc={animal.image} alt={`${animal.name}, 가족을 기다리는 ${animal.species}`} priority={priority} thumbnail onUnavailable={() => setImageUnavailable(true)}/>
        <div className="ff-animal-photo-caption"><div className="ff-animal-photo-name">{animal.name}</div></div>
      </div>
      <div className={`ff-detail-gallery-status ff-public-status-${publicStatus.phase} ff-animal-photo-status`}>
        {publicStatus.phase === "notice" && getNoticeDaysRemaining(publicStatus.notice) !== null && <span className="ff-detail-status-day">D-{getNoticeDaysRemaining(publicStatus.notice)}</span>}
        <strong>{publicStatus.cardLabel}</strong>
      </div>
    </Link>
    <FavoriteButton animalId={animal.id} animalName={animal.name} initialSaved={initialSaved} onFavoriteChange={onFavoriteChange} onRemoveRequest={remove => setRemoveScrap(() => remove)}/>
    <DialogRoot open={Boolean(removeScrap)} onOpenChange={open => { if (!open) setRemoveScrap(null); }}>
      <Portal>
      <DialogContent title="관심 친구에서 해제할까요?" description={`${animal.name} 친구가 관심 친구 목록에서 사라져요.`}>
        <DialogFooter>
          <ActionButton variant="neutralWeak" onClick={() => setRemoveScrap(null)}>취소</ActionButton>
          <ActionButton variant="neutralSolid" onClick={() => { const remove = removeScrap; setRemoveScrap(null); void remove?.(); }}>해제</ActionButton>
        </DialogFooter>
      </DialogContent>
      </Portal>
    </DialogRoot>
  </article>;
  const homeInfo = <Link prefetch={false} className="ff-animal-row-animal-link" href={animalHref}>
    <div className="ff-animal-name">{animal.name}</div>
    <div className="ff-animal-row-location"><span>{compactRegion(animal.region)}</span>{animal.distanceMeters !== undefined&&<div className="ff-animal-distance ff-animal-row-distance">{formatDistance(animal.distanceMeters)}</div>}</div>
    <div className="ff-meta">{displayAge(animal.age)} · {animal.sex}</div>
    {publicStatus.cardLabel&&<Badge className={`ff-animal-row-public-status ff-public-status-${publicStatus.phase}`} tone={publicStatus.tone} variant="weak">{publicStatus.cardLabel}</Badge>}
  </Link>;
  return <article className={`ff-animal-card${layout==="row"?" ff-animal-card-row":""}`}>
    {layout === "row" ? <div className="ff-animal-card-row-main">
      <Link prefetch={false} className="ff-animal-row-image-link" href={animalHref} aria-label={`${animal.name} 상세 보기`}>
        <div className="ff-animal-image-wrap"><AnimalThumbnail key={animal.thumbnail || animal.image} src={animal.thumbnail || animal.image} fallbackSrc={animal.image} alt={`${animal.name}, 가족을 기다리는 ${animal.species}`} priority={priority} thumbnail onUnavailable={() => setImageUnavailable(true)}/>{(animal.photoCount || 1) > 1 && <span className="ff-card-photo-count" role="img" aria-label={`사진 ${animal.photoCount}장`}><IconPicture2StackedLine aria-hidden="true"/></span>}</div>
      </Link>
      <div className="ff-animal-info ff-animal-row-info">
        {showShelter && <Link prefetch={false} className="ff-animal-row-shelter" href={shelterHref} aria-label={`${animal.shelter} 보호소 페이지 보기`}>{animal.shelter}</Link>}
        {homeInfo}
      </div>
    </div> : <div className="ff-animal-grid-main">
      <Link prefetch={false} href={animalHref} aria-label={`${animal.name} 상세 보기`}>
        <div className="ff-animal-image-wrap"><AnimalThumbnail key={animal.thumbnail || animal.image} src={animal.thumbnail || animal.image} fallbackSrc={animal.image} alt={`${animal.name}, 가족을 기다리는 ${animal.species}`} priority={priority} thumbnail onUnavailable={() => setImageUnavailable(true)}/>{(animal.photoCount || 1) > 1 && <span className="ff-card-photo-count" role="img" aria-label={`사진 ${animal.photoCount}장`}><IconPicture2StackedLine aria-hidden="true"/></span>}</div>
      </Link>
      <div className="ff-animal-info">
        {showShelter && <Link prefetch={false} className="ff-animal-row-shelter" href={shelterHref} aria-label={`${animal.shelter} 보호소 페이지 보기`}>{animal.shelter}</Link>}
        <Link prefetch={false} className="ff-animal-grid-animal-link" href={animalHref}>
          <div className="ff-meta">{animal.region} · {animal.source}</div><div className="ff-animal-name">{animal.name}</div><div className="ff-meta">{animal.age} · {animal.sex}</div>{animal.distanceMeters !== undefined&&<div className="ff-animal-distance">우리 동네에서 보호소까지 약 {formatDistance(animal.distanceMeters)}</div>}<div className="ff-tags">{animal.traits.slice(0, 2).map((trait) => <span className="ff-tag" key={trait}>{trait}</span>)}</div>
        </Link>
      </div>
    </div>}
    <FavoriteButton animalId={animal.id} animalName={animal.name} initialSaved={initialSaved} onFavoriteChange={onFavoriteChange}/>
  </article>;
}
