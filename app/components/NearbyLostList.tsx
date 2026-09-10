"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useState } from "react";
import { Callout } from "seed-design/ui/callout";
import type { LostAnimal } from "../../lib/public-data";
import { readHomeLocation } from "../../lib/geo";
import { lostDisplayRegion, lostRegionQuery } from "../../lib/lost-region";
import { loadDefaultHomeLocation } from "./defaultHomeLocation";

function savedRegionLabel() {
  try { return window.localStorage.getItem("ff-home-region") || ""; } catch { return ""; }
}

// 서버는 방문자의 동네를 알 수 없어 전국 목록을 먼저 그립니다.
// 마운트 직후 생활권 결과로 교체하고, 생활권을 정할 수 없으면 목록을 비웁니다.
export function NearbyLostList({ initialAnimals, limit, heading, emptyText }: { initialAnimals: LostAnimal[]; limit: number; heading: "h2" | "h3"; emptyText: string }) {
  const [animals, setAnimals] = useState(initialAnimals);
  const [scoped, setScoped] = useState(false);
  const [hasRegion, setHasRegion] = useState(true);
  const Heading = heading;

  useEffect(() => {
    let active = true, version = 0, controller: AbortController | null = null;
    const load = async () => {
      const current = ++version;
      const location = readHomeLocation() || await loadDefaultHomeLocation();
      if (!active || current !== version) return;
      const query = lostRegionQuery(location?.label || savedRegionLabel());
      controller?.abort();
      if (!query) { setHasRegion(false); setAnimals([]); setScoped(true); return; }
      setHasRegion(true);
      controller = new AbortController();
      const search = `?province=${encodeURIComponent(query.provinces[0])}&prefix=${encodeURIComponent(query.prefix)}${query.dong ? `&dong=${encodeURIComponent(query.dong)}` : ""}`;
      try {
        const response = await fetch(`/api/lost-found${search}`, { signal: controller.signal });
        if (!response.ok) throw new Error("lost animals unavailable");
        const body = await response.json() as { animals?: LostAnimal[] };
        if (active && current === version) { setAnimals((body.animals || []).slice(0, limit)); setScoped(true); }
      } catch {
        if (active && current === version) { setAnimals([]); setScoped(true); }
      }
    };
    void load();
    window.addEventListener("ff-region-change", load);
    return () => { active = false; controller?.abort(); window.removeEventListener("ff-region-change", load); };
  }, [limit]);

  if (scoped && !hasRegion) return <div className="ff-lost-region-empty">
    <Callout tone="informative" title="동네를 설정해 주세요" description="우리 동네에서 가족을 찾고 있는 동물만 보여드려요. 홈 상단에서 동네를 설정하면 바로 확인할 수 있어요." />
    <div className="ff-inline-actions" style={{ marginTop: 16 }}><Link className="ff-action-link" href="/">홈에서 동네 설정하기</Link></div>
  </div>;

  if (!animals.length) return <div className="ff-empty">{emptyText}</div>;

  return <div className="ff-lost-list">{animals.map(animal => <Link className="ff-lost-card" href={`/lost-found/animals/${encodeURIComponent(animal.id)}`} key={animal.id}>
    <Image src={animal.image} alt={`${animal.breed} 실종 등록 사진`} width={112} height={132} unoptimized />
    <div>
      <div className="ff-kicker">{lostDisplayRegion(animal.address, animal.region)}</div>
      <Heading>{animal.breed} · {animal.sex}</Heading>
      <p className="ff-description">{animal.happenedAt}<br />{animal.place}</p>
      <div className="ff-tags"><span className="ff-tag">{animal.color}</span><span className="ff-tag">{animal.age}</span></div>
      <p className="ff-lost-mark">{animal.description}</p>
    </div>
  </Link>)}</div>;
}
