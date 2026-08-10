/* eslint-disable @next/next/no-img-element */
import type { Animal } from "../../lib/data";
import { FavoriteButton } from "./FavoriteButton";
import { IconPictureLine } from "@karrotmarket/react-monochrome-icon";

export function AnimalCard({ animal,layout="grid" }: { animal: Animal;layout?:"grid"|"row" }) {
  return <article className={`ff-animal-card${layout==="row"?" ff-animal-card-row":""}`}>
    <a href={`/friends/${animal.id}`}>
      <div className="ff-animal-image-wrap"><img className="ff-animal-image" src={animal.image} alt={`${animal.name}, 가족을 기다리는 ${animal.species}`} loading="lazy"/>{(animal.photoCount || 1) > 1 && <span className="ff-card-photo-count"><IconPictureLine/>사진 {animal.photoCount}장</span>}</div>
      <div className="ff-animal-info"><div className="ff-meta">{animal.region} · {animal.source}</div><div className="ff-animal-name">{animal.name}</div><div className="ff-meta">{animal.age} · {animal.sex}</div><div className="ff-tags">{animal.traits.slice(0, 2).map((trait) => <span className="ff-tag" key={trait}>{trait}</span>)}</div></div>
    </a>
    <FavoriteButton animalId={animal.id} animalName={animal.name}/>
  </article>;
}
