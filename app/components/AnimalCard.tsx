/* eslint-disable @next/next/no-img-element */
import type { Animal } from "../../lib/data";

export function AnimalCard({ animal }: { animal: Animal }) {
  return <a className="animal-card" href={`/friends/${animal.id}`}>
    <img src={animal.image} alt={`${animal.name}, 가족을 기다리는 ${animal.species}`} loading="lazy" />
    <div className="animal-card-body">
      <div className="animal-meta"><span>{animal.species}</span><span>·</span><span>{animal.age}</span><span>·</span><span>{animal.region.split(" ")[0]}</span></div>
      <div className="animal-name">{animal.name}</div>
      <div className="tag-row">{animal.traits.slice(0,2).map((trait) => <span className="tag" key={trait}>{trait}</span>)}</div>
      <span className="source-label">{animal.source}</span>
    </div>
  </a>;
}
