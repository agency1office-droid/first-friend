import type { Animal } from "../../lib/data";
import { FavoriteButton } from "./FavoriteButton";
import { IconPicture2StackedLine } from "@karrotmarket/react-monochrome-icon";
import { formatDistance } from "../../lib/geo";
import { getAnimalPublicStatus } from "../../lib/animal-public-status";
import { Badge } from "seed-design/ui/badge";
import { AnimalThumbnail } from "./AnimalThumbnail";

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

export function AnimalCard({ animal,layout="grid",initialSaved,onFavoriteChange,showShelter=true,priority=false }: { animal: Animal;layout?:"grid"|"row";initialSaved?:boolean;onFavoriteChange?:(saved:boolean)=>void;showShelter?:boolean;priority?:boolean }) {
  const publicStatus = getAnimalPublicStatus(animal);
  const animalHref = `/friends/${animal.id}`;
  const shelterHref = animal.shelterId ? `/shelters/${encodeURIComponent(animal.shelterId)}` : "/shelters";
  return <article className={`ff-animal-card${layout==="row"?" ff-animal-card-row":""}`}>
    {layout === "row" ? <div className="ff-animal-card-row-main">
      <a className="ff-animal-row-image-link" href={animalHref} aria-label={`${animal.name} 상세 보기`}>
        <div className="ff-animal-image-wrap"><AnimalThumbnail src={animal.image} alt={`${animal.name}, 가족을 기다리는 ${animal.species}`} priority={priority} thumbnail/>{(animal.photoCount || 1) > 1 && <span className="ff-card-photo-count" role="img" aria-label={`사진 ${animal.photoCount}장`}><IconPicture2StackedLine aria-hidden="true"/></span>}</div>
      </a>
      <div className="ff-animal-info ff-animal-row-info">
        {showShelter && <a className="ff-animal-row-shelter" href={shelterHref} aria-label={`${animal.shelter} 보호소 페이지 보기`}>{animal.shelter}</a>}
        <a className="ff-animal-row-animal-link" href={animalHref}>
          <div className="ff-animal-name">{animal.name}</div>
          <div className="ff-animal-row-location"><span>{compactRegion(animal.region)}</span>{animal.distanceMeters !== undefined&&<div className="ff-animal-distance ff-animal-row-distance">{formatDistance(animal.distanceMeters)}</div>}</div>
          <div className="ff-meta">{displayAge(animal.age)} · {animal.sex}</div>
          {publicStatus.cardLabel&&<Badge className="ff-animal-row-public-status" tone={publicStatus.tone} variant="weak">{publicStatus.cardLabel}</Badge>}
        </a>
      </div>
    </div> : <a href={animalHref}>
      <div className="ff-animal-image-wrap"><AnimalThumbnail src={animal.image} alt={`${animal.name}, 가족을 기다리는 ${animal.species}`} priority={priority} thumbnail/>{(animal.photoCount || 1) > 1 && <span className="ff-card-photo-count" role="img" aria-label={`사진 ${animal.photoCount}장`}><IconPicture2StackedLine aria-hidden="true"/></span>}</div>
      <div className="ff-animal-info"><div className="ff-meta">{animal.region} · {animal.source}</div><div className="ff-animal-name">{animal.name}</div><div className="ff-meta">{animal.age} · {animal.sex}</div>{animal.distanceMeters !== undefined&&<div className="ff-animal-distance">우리 동네에서 보호소까지 약 {formatDistance(animal.distanceMeters)}</div>}<div className="ff-tags">{animal.traits.slice(0, 2).map((trait) => <span className="ff-tag" key={trait}>{trait}</span>)}</div></div>
    </a>}
    <FavoriteButton animalId={animal.id} animalName={animal.name} initialSaved={initialSaved} onFavoriteChange={onFavoriteChange}/>
  </article>;
}
