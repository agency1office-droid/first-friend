"use client";

import { useEffect, useRef } from "react";
import { ActionButton } from "seed-design/ui/action-button";
import { Callout } from "seed-design/ui/callout";
import type { AnimalPage } from "../../lib/public-animal-store";
import { AnimalCard } from "./AnimalCard";
import { AnimalFilterBar } from "./AnimalFilterBar";
import { useAnimalFeed } from "./useAnimalFeed";

export function NearbyAnimalFeed({ initialPage }: { initialPage: AnimalPage }) {
  const feed = useAnimalFeed(initialPage), sentinel = useRef<HTMLDivElement>(null), autoLoadReady = useRef(false);
  const { cursor, loadMore } = feed;
  useEffect(() => {
    const arm = () => { autoLoadReady.current = true; };
    window.addEventListener("wheel", arm, { passive: true });
    window.addEventListener("touchmove", arm, { passive: true });
    window.addEventListener("keydown", arm);
    return () => { window.removeEventListener("wheel", arm); window.removeEventListener("touchmove", arm); window.removeEventListener("keydown", arm); };
  }, []);
  useEffect(() => {
    const node = sentinel.current;
    if (!node || !cursor) return;
    const observer = new IntersectionObserver(entries => { if (entries[0]?.isIntersecting && autoLoadReady.current) { autoLoadReady.current = false; void loadMore(); } }, { rootMargin: "300px 0px" });
    observer.observe(node);
    return () => observer.disconnect();
  }, [cursor, loadMore]);
  return <>
    <section className="ff-nearby-setting">
      <div className="ff-section-head"><div><div className="ff-kicker">내 집 근처 우선</div><h2 className="ff-section-title">{feed.location ? `${feed.location.label} 가까운 순` : "동네를 설정해 주세요"}</h2></div></div>
      {!feed.location && (
        <Callout tone="informative" title="가까운 친구를 먼저 보려면" description="홈 상단의 지역 설정에서 동·읍·면을 선택해 주세요." linkProps={{ href: "/", children: "동네 설정하기" }}/>
      )}
      <AnimalFilterBar filters={feed.filters} location={feed.location} hasLocation={Boolean(feed.location)} activeCount={feed.activeCount} setFilter={feed.setFilter} resetFilters={feed.resetFilters}/>
      <p className="ff-meta">정확한 집 주소는 저장하지 않으며 선택한 동네 중심에서 보호소까지의 직선거리를 사용해요.</p>
    </section>
    <div className="ff-section-head"><h2 className="ff-section-title">현재 보호 중인 친구</h2><span className="ff-meta">{feed.total.toLocaleString("ko-KR")}마리</span></div>
    <div className="ff-animal-grid">{feed.items.map(animal => <AnimalCard key={animal.id} animal={animal}/>)}</div>
    {!feed.items.length && !feed.loading && <div className="ff-filter-empty"><strong>현재 조건에 맞는 친구가 없어요</strong><p>조건을 모두 지우면 보호 중인 친구를 다시 볼 수 있어요.</p><ActionButton variant="neutralWeak" onClick={feed.resetFilters}>조건 모두 지우기</ActionButton></div>}
    {feed.error && <div className="ff-feed-error">{feed.error}<button type="button" onClick={() => void feed.loadMore()}>다시 시도</button></div>}
    <div className="ff-feed-sentinel" ref={sentinel}>{feed.loading ? "친구를 더 불러오고 있어요…" : feed.cursor ? <button type="button" onClick={() => void feed.loadMore()}>친구 더 보기</button> : feed.items.length ? "현재 확인 가능한 친구를 모두 봤어요" : ""}</div>
  </>;
}
