"use client";
import { useEffect, useMemo, useState } from "react";
import type { Animal } from "../../lib/data";
import { AnimalCard } from "./AnimalCard";
import { ActionButton } from "seed-design/ui/action-button";
import { Chip } from "seed-design/ui/chip";
import { Callout } from "seed-design/ui/callout";
import { TextField, TextFieldInput } from "seed-design/ui/text-field";

export function NearbyAnimalFeed({ animals, initialRegion = "" }: { animals: Animal[]; initialRegion?: string }) {
  const [region, setRegion] = useState(initialRegion);
  const [species, setSpecies] = useState("전체");
  const [status, setStatus] = useState("");
  useEffect(()=>{if(!initialRegion)fetch("/api/profile").then(r=>r.json()).then(v=>{if(v.homeRegion)setRegion(v.homeRegion)}).catch(()=>undefined)},[initialRegion]);
  const sorted = useMemo(() => [...animals]
    .filter((animal) => species === "전체" || animal.species.includes(species))
    .sort((a, b) => Number(Boolean(region) && b.region.startsWith(region)) - Number(Boolean(region) && a.region.startsWith(region))), [animals, region, species]);
  async function saveRegion() {
    const response = await fetch("/api/profile", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ homeRegion: region }) });
    if (response.status === 401) return setStatus("로그인하면 내 지역을 계정에 저장하고 알림에 사용할 수 있어요.");
    setStatus(response.ok ? "내 지역을 저장했어요. 가까운 친구를 먼저 보여드려요." : "지역을 저장하지 못했어요.");
  }
  return <>
    <section className="ff-nearby-setting">
      <div className="ff-section-head"><div><div className="ff-kicker">내 집 근처 우선</div><h2 className="ff-section-title">어느 동네에서 찾을까요?</h2></div></div>
      <div className="ff-inline-form"><TextField aria-label="내 지역"><TextFieldInput value={region} onChange={(event) => setRegion(event.target.value)} placeholder="예: 서울 마포구"/></TextField><ActionButton onClick={saveRegion}>지역 저장</ActionButton></div>
      <Chip.RadioRoot value={species} onValueChange={(value) => setSpecies(String(value))}>{["전체", "고양이", "강아지"].map((item) => <Chip.RadioItem key={item} value={item}><Chip.Label>{item}</Chip.Label></Chip.RadioItem>)}</Chip.RadioRoot>
      {status && <Callout tone="informative" description={status}/>}<p className="ff-meta">정확한 집 주소는 받지 않으며 시·군·구가 같은 친구를 먼저 정렬해요.</p>
    </section>
    <div className="ff-section-head"><h2 className="ff-section-title">현재 가족을 기다리는 친구</h2><span className="ff-meta">개·고양이 {sorted.length}마리</span></div>
    <div className="ff-animal-grid">{sorted.map((animal) => <AnimalCard key={animal.id} animal={animal}/>)}</div>
  </>;
}
