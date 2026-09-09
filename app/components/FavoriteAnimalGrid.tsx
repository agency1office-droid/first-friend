"use client";

import { useState } from "react";
import type { Animal } from "../../lib/data";
import { AnimalCard } from "./AnimalCard";
import { Chip } from "seed-design/ui/chip";
import { getAnimalPublicStatus } from "../../lib/animal-public-status";

const speciesOptions = [["all", "전체"], ["강아지", "강아지"], ["고양이", "고양이"], ["other", "기타 동물"]] as const;
const statusOptions = [["all", "전체"], ["protected", "입양 상담 가능"], ["notice", "보호자 확인 공고 중"], ["ended", "보호 종료"], ["unknown", "상태 확인 필요"]] as const;

export function FavoriteAnimalGrid({ animals: initialAnimals }: { animals: Animal[] }) {
  const [animals, setAnimals] = useState(initialAnimals);
  const [species, setSpecies] = useState("all");
  const [status, setStatus] = useState("all");
  const filtered = animals.filter(animal => (species === "all" || (species === "other" ? !["강아지", "고양이"].includes(animal.species) : animal.species === species)) && (status === "all" || getAnimalPublicStatus(animal).phase === status));
  const active = species !== "all" || status !== "all";
  const reset = () => { setSpecies("all"); setStatus("all"); };
  if (!animals.length) return <div className="ff-empty">아직 스크랩한 친구가 없어요.</div>;
  return <>
    <div className="ff-favorite-filters">
      <div className="ff-favorite-filter-row" role="group" aria-label="동물 종류">
        {speciesOptions.map(([value, label]) => <Chip.Button key={value} variant="outlineWeak" size="medium" aria-pressed={species === value} data-checked={species === value || undefined} onClick={() => setSpecies(value)}><Chip.Label>{label}</Chip.Label></Chip.Button>)}
      </div>
      <div className="ff-favorite-filter-row" role="group" aria-label="보호 상태">
        {statusOptions.map(([value, label]) => <Chip.Button key={value} variant="outlineWeak" size="medium" aria-pressed={status === value} data-checked={status === value || undefined} onClick={() => setStatus(value)}><Chip.Label>{label}</Chip.Label></Chip.Button>)}
      </div>
      <div className="ff-favorite-filter-summary"><span role="status">{filtered.length}마리</span>{active && <Chip.Button variant="outlineWeak" size="small" onClick={reset}><Chip.Label>필터 초기화</Chip.Label></Chip.Button>}</div>
    </div>
    {filtered.length ? <div className="ff-animal-grid">
      {filtered.map(animal => <AnimalCard key={animal.id} animal={animal} layout="photo" initialSaved onFavoriteChange={saved => { if (!saved) setAnimals(current => current.filter(item => item.id !== animal.id)); }}/>) }
    </div> : <div className="ff-empty">선택한 조건에 맞는 친구가 없어요.</div>}
  </>;
}
