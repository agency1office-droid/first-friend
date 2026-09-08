"use client";

import { useEffect, useState } from "react";
import type { Animal } from "../../lib/data";
import { distanceMeters, isKoreaPoint, readHomeLocation, type HomeLocation } from "../../lib/geo";
import { AnimalCard } from "./AnimalCard";

export function FavoriteAnimalGrid({ animals: initialAnimals }: { animals: Animal[] }) {
  const [animals, setAnimals] = useState(initialAnimals);
  const [location, setLocation] = useState<HomeLocation | null>(null);
  useEffect(() => {
    let active = true;
    const update = () => { if (active) setLocation(readHomeLocation()); };
    queueMicrotask(update);
    window.addEventListener("ff-region-change", update);
    window.addEventListener("storage", update);
    return () => {
      active = false;
      window.removeEventListener("ff-region-change", update);
      window.removeEventListener("storage", update);
    };
  }, []);
  if (!animals.length) return <div className="ff-empty">아직 스크랩한 친구가 없어요.</div>;
  return <div className="ff-animal-grid">
    {animals.map(animal => {
      const shelter = { lat: animal.shelterLat, lng: animal.shelterLng };
      const nearbyAnimal = location && isKoreaPoint(shelter) ? { ...animal, distanceMeters: distanceMeters(location, shelter) } : animal;
      return <AnimalCard key={animal.id} animal={nearbyAnimal} showHomeInfo initialSaved onFavoriteChange={saved => { if (!saved) setAnimals(current => current.filter(item => item.id !== animal.id)); }}/>;
    })}
  </div>;
}
