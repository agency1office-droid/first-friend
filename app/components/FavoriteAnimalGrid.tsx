"use client";

import { useState } from "react";
import type { Animal } from "../../lib/data";
import { AnimalCard } from "./AnimalCard";

export function FavoriteAnimalGrid({ animals: initialAnimals }: { animals: Animal[] }) {
  const [animals, setAnimals] = useState(initialAnimals);
  if (!animals.length) return <div className="ff-empty">아직 스크랩한 친구가 없어요.</div>;
  return <div className="ff-animal-grid">
    {animals.map(animal => <AnimalCard key={animal.id} animal={animal} initialSaved onFavoriteChange={saved => { if (!saved) setAnimals(current => current.filter(item => item.id !== animal.id)); }}/>) }
  </div>;
}
