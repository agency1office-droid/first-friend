"use client";

import { useEffect, useState } from "react";
import { IconChevronDownLine } from "@karrotmarket/react-monochrome-icon";
import { Icon } from "@seed-design/react";
import { ActionButton } from "seed-design/ui/action-button";
import { BottomSheetBody, BottomSheetContent, BottomSheetFooter, BottomSheetRoot, BottomSheetTrigger } from "seed-design/ui/bottom-sheet";
import { Chip } from "seed-design/ui/chip";
import type { AnimalFeedFilters } from "./useAnimalFeed";
import { AllAnimalFilters } from "./AllAnimalFilters";

const statusOptions = [["all", "모두", "현재 보호 중인 친구를 모두 볼 수 있어요."], ["checking", "입양 상담 가능", "보호자 확인이 끝나 상담을 시작할 수 있어요."], ["notice", "보호자 확인 공고 중", "보호자를 찾는 절차가 진행 중인 친구예요."]] as const;
const sortOptions = [["distance", "가까운 보호소 순", "내 동네에서 가까운 보호소부터 볼 수 있어요."], ["recent", "최근 등록순", "새로 등록된 친구부터 볼 수 있어요."]] as const;
const coatColors = ["흰색", "검정", "갈색", "황색", "회색", "삼색", "고등어", "치즈"] as const;
const dogCoatColors = ["흰색", "검정", "갈색", "황색", "회색"] as const;
const catCoatColors = ["흰색", "검정", "갈색", "회색", "삼색", "고등어", "치즈"] as const;

function SimpleOptionSheet({ title, description, value, options, active, onChange, onReset }: { title: string; description: string; value: string; options: readonly (readonly [string, string, string])[]; active: boolean; onChange: (value: string) => void; onReset: () => void }) {
  const [open, setOpen] = useState(false);
  return <BottomSheetRoot open={open} onOpenChange={setOpen}><BottomSheetTrigger asChild><Chip.Button className="ff-animal-filter-chip" variant="outlineWeak" size="medium" data-checked={active || undefined}><Chip.Label>{title === "정렬 기준" ? value === "recent" ? "최근 등록순" : "가까운 순" : "보호 단계"}</Chip.Label><Chip.SuffixIcon><Icon svg={<IconChevronDownLine />} /></Chip.SuffixIcon></Chip.Button></BottomSheetTrigger><BottomSheetContent title={title} description={description}><BottomSheetBody className="ff-status-filter-body"><div className="ff-status-options" role="listbox" aria-label={title}>{options.map(([optionValue, label, optionDescription]) => <button className="ff-status-option" type="button" key={optionValue} role="option" aria-selected={value === optionValue} onClick={() => { onChange(optionValue); setOpen(false); }}><span><strong>{label}</strong><small>{optionDescription}</small></span>{value === optionValue && <b aria-hidden>✓</b>}</button>)}</div></BottomSheetBody>{active && <BottomSheetFooter><ActionButton variant="neutralWeak" onClick={() => { onReset(); setOpen(false); }}>선택 해제</ActionButton></BottomSheetFooter>}</BottomSheetContent></BottomSheetRoot>;
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
  return <div className="ff-animal-filter-wrap" aria-label="보호동물 목록 필터"><div className="ff-animal-filter-scroll"><AllAnimalFilters activeCount={activeCount} filters={filters} setFilter={setFilter} resetFilters={resetFilters}/><SimpleOptionSheet title="정렬 기준" description="가까운 보호소 또는 최근 등록된 순서로 볼 수 있어요." value={sortValue} options={sortOptions} active={sortValue === "distance"} onChange={value => setFilter("sort", value as AnimalFeedFilters["sort"])} onReset={() => setFilter("sort", "distance")}/><SimpleOptionSheet title="보호 단계" description="현재 보호 절차에 따라 친구를 골라볼 수 있어요." value={filters.publicStatus} options={statusOptions} active={filters.publicStatus !== "all"} onChange={value => setFilter("publicStatus", value as AnimalFeedFilters["publicStatus"])} onReset={() => setFilter("publicStatus", "all")}/><SpeciesFilterSheet value={filters.species} onChange={value => { setFilter("species", value); setFilter("breedKeys", []); }} onReset={() => { setFilter("species", "all"); setFilter("breedKeys", []); }}/>{activeCount > 0 && <Chip.Button className="ff-animal-filter-reset" variant="outlineWeak" size="medium" onClick={resetFilters}><Chip.Label>전체 초기화</Chip.Label></Chip.Button>}</div></div>;
}
