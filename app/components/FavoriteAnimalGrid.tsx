"use client";

import { useState } from "react";
import type { Animal } from "../../lib/data";
import { AnimalCard } from "./AnimalCard";
import { Chip } from "seed-design/ui/chip";
import { FavoriteFilterSheet as SimpleOptionSheet } from "./FavoriteFilterSheet";
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
      <div className="ff-animal-filter-wrap" aria-label="관심 친구 필터"><div className="ff-animal-filter-scroll">
        <SimpleOptionSheet title="보호 단계" description="보호 상태에 따라 관심 친구를 골라볼 수 있어요." value={status} options={statusOptions.map(([value, label]) => [value, label, value === "all" ? "스크랩한 친구를 모두 볼 수 있어요." : `${label} 상태의 친구만 볼 수 있어요.`])} active={status !== "all"} onChange={setStatus} onReset={() => setStatus("all")} />
        <SimpleOptionSheet title="동물 종류" triggerLabel={species === "all" ? "동물 종류" : speciesOptions.find(([value]) => value === species)?.[1]} description="찾고 싶은 친구의 종류를 골라보세요." value={species} options={speciesOptions.map(([value, label]) => [value, label, value === "all" ? "모든 동물 종류를 함께 볼 수 있어요." : `${label} 친구만 볼 수 있어요.`])} active={species !== "all"} onChange={setSpecies} onReset={() => setSpecies("all")} />
        {active && <Chip.Button className="ff-animal-filter-reset" variant="outlineWeak" size="medium" onClick={reset}><Chip.Label>전체 초기화</Chip.Label></Chip.Button>}
      </div></div>
      <div className="ff-favorite-filter-summary"><span role="status">{filtered.length}마리</span></div>
    </div>
    {filtered.length ? <div className="ff-animal-grid">
      {filtered.map(animal => <AnimalCard key={animal.id} animal={animal} layout="photo" initialSaved onFavoriteChange={saved => { if (!saved) setAnimals(current => current.filter(item => item.id !== animal.id)); }}/>) }
    </div> : <div className="ff-empty">선택한 조건에 맞는 친구가 없어요.</div>}
  </>;
}
