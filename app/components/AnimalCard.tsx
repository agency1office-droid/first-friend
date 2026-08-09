/* eslint-disable @next/next/no-img-element */
import Link from "next/link";
import type { Animal } from "../../lib/data";
import { FavoriteButton } from "./FavoriteButton";

export function AnimalCard({ animal }: { animal: Animal }) {
  return <article className="ff-animal-card">
    <Link href={`/friends/${animal.id}`}>
      <div className="ff-animal-image-wrap"><img className="ff-animal-image" src={animal.image} alt={`${animal.name}, 가족을 기다리는 ${animal.species}`} loading="lazy"/></div>
      <div className="ff-animal-info"><div className="ff-meta">{animal.region} · {animal.source}</div><div className="ff-animal-name">{animal.name}</div><div className="ff-meta">{animal.age} · {animal.sex}</div><div className="ff-tags">{animal.traits.slice(0, 2).map((trait) => <span className="ff-tag" key={trait}>{trait}</span>)}</div></div>
    </Link>
    <FavoriteButton animalId={animal.id} animalName={animal.name}/>
  </article>;
}
