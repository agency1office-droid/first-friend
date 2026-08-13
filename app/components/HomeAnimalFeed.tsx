"use client";

import Image from "next/image";
import Link from "next/link";
import { Fragment, useEffect, useRef, useState } from "react";
import { IconArrowUpRightLine } from "@karrotmarket/react-monochrome-icon";
import { ActionButton } from "seed-design/ui/action-button";
import type { LostAnimal } from "../../lib/public-data";
import type { AnimalPage } from "../../lib/public-animal-store";
import { AnimalCard } from "./AnimalCard";
import { AnimalFilterBar } from "./AnimalFilterBar";
import { HOME_FEED_SNAPSHOT_KEY, useAnimalFeed } from "./useAnimalFeed";

function compactLostDate(value: string) {
  const match = value.match(/(\d{4})[-.](\d{1,2})[-.](\d{1,2})/);
  return match ? `${Number(match[2])}월 ${Number(match[3])}일` : value;
}

function compactLostRegion(value: string) {
  const parts = value.replace(/특별자치도|특별자치시|특별시|광역시|자치시/g, "").trim().split(/\s+/).filter(Boolean);
  return parts.slice(-2).join(" ") || value;
}

function compactLostDescription(value: string) {
  const text = value.trim();
  return text.length > 25 ? `${text.slice(0, 25)}...` : text;
}

function formatSyncTime(value: string | null) {
  if (!value) return "보호동물 정보를 확인하는 중이에요";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "보호동물 정보";
  return `마지막 확인 ${new Intl.DateTimeFormat("ko-KR", { month: "numeric", day: "numeric", hour: "numeric", minute: "2-digit" }).format(date)}`;
}

function FeedLoadingState() {
  return <div className="ff-feed-loading" role="status" aria-live="polite">
    <div className="ff-feed-loading-title"><span className="ff-skeleton ff-skeleton-title" /><span className="ff-skeleton ff-skeleton-count" /></div>
    {[1, 2, 3].map(index => <div className="ff-feed-loading-row" key={index}>
      <span className="ff-skeleton ff-skeleton-photo" />
      <span className="ff-feed-loading-copy"><span className="ff-skeleton ff-skeleton-line ff-skeleton-line-short" /><span className="ff-skeleton ff-skeleton-line" /><span className="ff-skeleton ff-skeleton-line ff-skeleton-line-medium" /></span>
    </div>)}
    <span className="ff-feed-loading-label">가까운 보호동물을 불러오고 있어요…</span>
  </div>;
}

function LostAnimalInsert({ animal }: { animal: LostAnimal }) {
  const detailHref = `/lost-found/animals/${encodeURIComponent(animal.id)}`;
  return <section className="ff-home-lost-insert" aria-label="실종 동물 안내">
    <Link className="ff-home-lost-link" href={detailHref} target="_blank" rel="noreferrer" aria-label={`${animal.species} 실종 동물 상세 정보를 새 탭에서 보기`}>
      <div className="ff-home-lost-head"><div><div className="ff-kicker">도움이 필요한 이웃</div><h2>우리 동네에서 찾고 있어요</h2></div><span className="ff-home-lost-external-icon"><IconArrowUpRightLine aria-hidden /></span></div>
      <div className="ff-home-lost-card">
        <Image src={animal.image} alt={`${animal.breed} 실종 동물`} width={104} height={104} unoptimized />
        <span><strong>{animal.species} · {animal.sex}</strong><small>{compactLostRegion(animal.region)} · {compactLostDate(animal.happenedAt)}</small><small>{compactLostDescription(animal.description || "등록된 특징이 없습니다.")}</small></span>
      </div>
    </Link>
  </section>;
}

export function HomeAnimalFeed({ initialPage }: { initialPage: AnimalPage }) {
  const feed = useAnimalFeed(initialPage), sentinel = useRef<HTMLDivElement>(null), autoLoading = useRef(false);
  const scrollRestored = useRef(false);
  const [lostAnimals, setLostAnimals] = useState<LostAnimal[]>([]);
  const { cursor, loadMore } = feed;
  useEffect(() => {
    if (scrollRestored.current || !feed.items.length) return;
    try {
      const snapshot = JSON.parse(window.sessionStorage.getItem(HOME_FEED_SNAPSHOT_KEY) || "null") as { url?: string; scrollY?: number } | null;
      const url = `${window.location.pathname}${window.location.search}`;
      if (snapshot?.url === url && Number(snapshot.scrollY) > 0) window.setTimeout(() => window.scrollTo({ top: Number(snapshot.scrollY), behavior: "auto" }), 0);
      scrollRestored.current = true;
    } catch { /* 세션 복원은 보조 기능이라 실패해도 피드 이용은 계속합니다. */ }
  }, [feed.items.length]);
  const lostRegion = feed.location?.label || feed.region;
  useEffect(() => { let active = true; const query = lostRegion ? `?region=${encodeURIComponent(lostRegion)}` : ""; fetch(`/api/lost-found${query}`).then(response => response.ok ? response.json() as Promise<{ animals?: LostAnimal[] }> : Promise.reject(new Error("lost animals unavailable"))).then(body => { if (active) setLostAnimals(body.animals || []); }).catch(() => { if (active) setLostAnimals([]); }); return () => { active = false; }; }, [lostRegion]);
  useEffect(() => {
    const node = sentinel.current;
    if (!node || !cursor) return;
    const observer = new IntersectionObserver(entries => {
      if (!entries[0]?.isIntersecting || autoLoading.current) return;
      autoLoading.current = true;
      void loadMore().finally(() => { autoLoading.current = false; });
    }, { rootMargin: "500px 0px" });
    observer.observe(node);
    return () => observer.disconnect();
  }, [cursor, loadMore]);
  const count = feed.total.toLocaleString("ko-KR");
  const area = feed.location?.label || feed.region;
  const recent = feed.filters.sort === "recent" || !feed.location;
  const kicker = recent ? "새로 등록된 친구들" : (area ? `${area}에서 실제 거리순` : "현재 위치를 설정하면 가까운 순");
  const title = recent ? "가족을 기다리는 새 친구들" : "생각보다 가까운 친구들";
  return <section className="ff-home-feed" id="nearby-animals" aria-label="새 가족을 기다리는 보호동물">
    <header className="ff-home-feed-head"><div><div className="ff-kicker">{kicker}</div><h1 id="nearby-title">{title}</h1></div><a href="/find">전체 {count}마리</a></header>
    <AnimalFilterBar filters={feed.filters} location={feed.location} hasLocation={Boolean(feed.location)} activeCount={feed.activeCount} setFilter={feed.setFilter} resetFilters={feed.resetFilters}/>
    <p className={`ff-feed-freshness${feed.stale ? " is-stale" : ""}`} role="status">{feed.stale ? "공공데이터가 잠시 늦게 갱신되고 있어요 · " : ""}{formatSyncTime(feed.syncedAt)}</p>
    {feed.loading && !feed.items.length ? <FeedLoadingState/> : <div className="ff-animal-list">{feed.items.map((animal, index) => <Fragment key={animal.id}><AnimalCard animal={animal} layout="row" priority={index < 4}/>{(index + 1) % 25 === 0 && lostAnimals[(index + 1) / 25 - 1] && <LostAnimalInsert animal={lostAnimals[(index + 1) / 25 - 1]}/>}</Fragment>)}</div>}
    {!feed.items.length && !feed.loading && !feed.error && <div className="ff-filter-empty"><strong>현재 조건에 맞는 친구가 없어요</strong><p>조건을 모두 지우면 가까운 친구부터 다시 볼 수 있어요. 전국으로 넓혀보거나 새 친구 알림을 켜도 좋아요.</p><ActionButton variant="neutralWeak" onClick={feed.resetFilters}>조건 모두 지우기</ActionButton></div>}
    {feed.error && <div className="ff-feed-error" role="alert"><span>{feed.error}</span><button type="button" onClick={() => window.location.reload()}>{feed.items.length ? "다시 불러오기" : "다시 시도"}</button></div>}
    <div className="ff-feed-sentinel" ref={sentinel} aria-hidden="true" />
  </section>;
}
