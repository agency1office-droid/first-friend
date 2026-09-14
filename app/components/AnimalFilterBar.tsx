"use client";

import { useEffect, useRef, useState } from "react";
import { IconChevronDownLine } from "@karrotmarket/react-monochrome-icon";
import { Icon } from "@seed-design/react";
import { ActionButton } from "seed-design/ui/action-button";
import { BottomSheetBody, BottomSheetContent, BottomSheetFooter, BottomSheetRoot, BottomSheetTrigger } from "seed-design/ui/bottom-sheet";
import { Chip } from "seed-design/ui/chip";
import type { AnimalFeedFilters } from "./useAnimalFeed";
import { AllAnimalFilters } from "./AllAnimalFilters";

const statusOptions = [["all", "모두", "현재 보호 중인 친구를 모두 볼 수 있어요."], ["checking", "입양 상담 가능", "보호자 확인이 끝나 상담을 시작할 수 있어요."], ["notice", "보호자 확인 공고 중", "보호자를 찾는 절차가 진행 중인 친구예요."]] as const;
const sortOptions = [["distance", "가까운 보호소 순", "내 동네에서 가까운 보호소부터 볼 수 있어요."], ["recent", "최근 등록순", "새로 등록된 친구부터 볼 수 있어요."]] as const;
const healthOptions = [["all", "전체", "건강 상태와 상관없이 모두 볼 수 있어요."], ["ok", "양호·미확인", "보호소 특징 메모에 치료 및 관리가 필요한 내용이 없는 친구예요."], ["care", "치료 및 관리 필요", "보호소 특징 메모에 질병·부상이나 치료 중인 내용이 있는 친구예요."]] as const;
const coatColors = ["흰색", "검정", "갈색", "황색", "회색", "삼색", "고등어", "치즈"] as const;
const dogCoatColors = ["흰색", "검정", "갈색", "황색", "회색"] as const;
const catCoatColors = ["흰색", "검정", "갈색", "회색", "삼색", "고등어", "치즈"] as const;

function SimpleOptionSheet({ title, description, value, options, active, onChange, onReset }: { title: string; description: string; value: string; options: readonly (readonly [string, string, string])[]; active: boolean; onChange: (value: string) => void; onReset: () => void }) {
  const [open, setOpen] = useState(false);
  return <BottomSheetRoot open={open} onOpenChange={setOpen}><BottomSheetTrigger asChild><Chip.Button className="ff-animal-filter-chip" variant="outlineWeak" size="medium" data-checked={active || undefined}><Chip.Label>{title === "정렬 기준" ? value === "recent" ? "최근 등록순" : "가까운 순" : title}</Chip.Label><Chip.SuffixIcon><Icon svg={<IconChevronDownLine />} /></Chip.SuffixIcon></Chip.Button></BottomSheetTrigger><BottomSheetContent title={title} description={description}><BottomSheetBody className="ff-status-filter-body"><div className="ff-status-options" role="listbox" aria-label={title}>{options.map(([optionValue, label, optionDescription]) => <button className="ff-status-option" type="button" key={optionValue} role="option" aria-selected={value === optionValue} onClick={() => { onChange(optionValue); setOpen(false); }}><span><strong>{label}</strong><small>{optionDescription}</small></span>{value === optionValue && <b aria-hidden>✓</b>}</button>)}</div></BottomSheetBody>{active && <BottomSheetFooter><ActionButton variant="neutralWeak" onClick={() => { onReset(); setOpen(false); }}>선택 해제</ActionButton></BottomSheetFooter>}</BottomSheetContent></BottomSheetRoot>;
}

function SpeciesFilterSheet({ value, onChange, onReset }: { value: AnimalFeedFilters["species"]; onChange: (value: AnimalFeedFilters["species"]) => void; onReset: () => void }) {
  const [open, setOpen] = useState(false);
  const options = [["all", "모두", "강아지와 고양이를 함께 볼 수 있어요."], ["dog", "강아지", "강아지 친구만 볼 수 있어요."], ["cat", "고양이", "고양이 친구만 볼 수 있어요."]] as const;
  return <BottomSheetRoot open={open} onOpenChange={setOpen}><BottomSheetTrigger asChild><Chip.Button className="ff-animal-filter-chip" variant="outlineWeak" size="medium" data-checked={value !== "all" || undefined}><Chip.Label>{value === "dog" ? "강아지" : value === "cat" ? "고양이" : "동물 종류"}</Chip.Label><Chip.SuffixIcon><Icon svg={<IconChevronDownLine />} /></Chip.SuffixIcon></Chip.Button></BottomSheetTrigger><BottomSheetContent title="동물 종류" description="찾고 싶은 친구의 종류를 골라보세요."><BottomSheetBody className="ff-status-filter-body"><div className="ff-status-options" role="listbox" aria-label="동물 종류">{options.map(([optionValue, label, description]) => <button className="ff-status-option" type="button" key={optionValue} role="option" aria-selected={value === optionValue} onClick={() => { onChange(optionValue); setOpen(false); }}><span><strong>{label}</strong><small>{description}</small></span>{value === optionValue && <b aria-hidden>✓</b>}</button>)}</div></BottomSheetBody>{value !== "all" && <BottomSheetFooter><ActionButton variant="neutralWeak" onClick={() => { onReset(); setOpen(false); }}>선택 해제</ActionButton></BottomSheetFooter>}</BottomSheetContent></BottomSheetRoot>;
}

export function AnimalFilterBar({ filters, activeCount, setFilter, resetFilters }: { filters: AnimalFeedFilters; location: { lat: number; lng: number } | null; hasLocation: boolean; activeCount: number; setFilter: <K extends keyof AnimalFeedFilters>(key: K, value: AnimalFeedFilters[K]) => void; resetFilters: () => void }) {
  // 주소를 아직 확보하지 못한 순간에도 사용자가 선택한 기본 정렬을
  // 최근 등록순으로 바꿔 보이지 않게 합니다. 위치가 준비되면 거리순으로 요청됩니다.
  const sortValue = filters.sort;
  useEffect(() => {
    const available = filters.species === "dog" ? dogCoatColors : filters.species === "cat" ? catCoatColors : coatColors;
    if (filters.color !== "all" && !available.includes(filters.color as never)) setFilter("color", "all");
  }, [filters.color, filters.species, setFilter]);
  // 칩이 화면보다 길면 잘린 쪽에 흰색 그라데이션을 띄웁니다(data-scroll-start/end → CSS). 스크롤·칩 변화 때마다 다시 잽니다.
  const scrollRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const scroller = scrollRef.current, wrap = scroller?.parentElement;
    if (!scroller || !wrap) return;
    const update = () => {
      wrap.toggleAttribute("data-scroll-start", scroller.scrollLeft > 1);
      wrap.toggleAttribute("data-scroll-end", scroller.scrollLeft < scroller.scrollWidth - scroller.clientWidth - 1);
    };
    update();
    scroller.addEventListener("scroll", update, { passive: true });
    const observer = typeof ResizeObserver === "undefined" ? null : new ResizeObserver(update);
    observer?.observe(scroller);
    for (const chip of scroller.children) observer?.observe(chip);
    return () => { scroller.removeEventListener("scroll", update); observer?.disconnect(); };
  }, [filters, activeCount]);
  // PC에서는 마우스로 끌어서 넘길 수 있게 합니다. 터치는 원래 스크롤을 그대로 쓰고, 끌고 난 직후의 클릭은 칩 선택으로 치지 않습니다.
  const dragged = useRef(false);
  const startDrag = (event: React.PointerEvent<HTMLDivElement>) => {
    if (event.pointerType !== "mouse" || event.button !== 0) return;
    const scroller = event.currentTarget, startX = event.clientX, startLeft = scroller.scrollLeft;
    dragged.current = false;
    const move = (moveEvent: PointerEvent) => {
      const delta = moveEvent.clientX - startX;
      if (!dragged.current && Math.abs(delta) < 4) return;
      dragged.current = true;
      scroller.dataset.dragging = "";
      scroller.scrollLeft = startLeft - delta;
    };
    const stop = () => { delete scroller.dataset.dragging; window.removeEventListener("pointermove", move); window.removeEventListener("pointerup", stop); window.removeEventListener("pointercancel", stop); };
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", stop);
    window.addEventListener("pointercancel", stop);
  };
  const swallowClickAfterDrag = (event: React.MouseEvent<HTMLDivElement>) => {
    if (!dragged.current) return;
    dragged.current = false;
    event.preventDefault();
    event.stopPropagation();
  };
  return <div className="ff-animal-filter-wrap" aria-label="보호동물 목록 필터"><div className="ff-animal-filter-scroll" ref={scrollRef} onPointerDown={startDrag} onClickCapture={swallowClickAfterDrag}><AllAnimalFilters activeCount={activeCount} filters={filters} setFilter={setFilter} resetFilters={resetFilters}/><SimpleOptionSheet title="정렬 기준" description="가까운 보호소 또는 최근 등록된 순서로 볼 수 있어요." value={sortValue} options={sortOptions} active={sortValue === "distance"} onChange={value => setFilter("sort", value as AnimalFeedFilters["sort"])} onReset={() => setFilter("sort", "distance")}/><SimpleOptionSheet title="보호 단계" description="현재 보호 절차에 따라 친구를 골라볼 수 있어요." value={filters.publicStatus} options={statusOptions} active={filters.publicStatus !== "all"} onChange={value => setFilter("publicStatus", value as AnimalFeedFilters["publicStatus"])} onReset={() => setFilter("publicStatus", "all")}/><SimpleOptionSheet title="건강" description="보호소 특징 메모를 바탕으로 건강 상태에 따라 친구를 골라볼 수 있어요." value={filters.health} options={healthOptions} active={filters.health !== "all"} onChange={value => setFilter("health", value as AnimalFeedFilters["health"])} onReset={() => setFilter("health", "all")}/><SpeciesFilterSheet value={filters.species} onChange={value => { setFilter("species", value); setFilter("breedKeys", []); }} onReset={() => { setFilter("species", "all"); setFilter("breedKeys", []); }}/>{activeCount > 0 && <Chip.Button className="ff-animal-filter-reset" variant="outlineWeak" size="medium" onClick={resetFilters}><Chip.Label>전체 초기화</Chip.Label></Chip.Button>}</div></div>;
}
