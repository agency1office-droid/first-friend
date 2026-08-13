"use client";

import { useEffect, useState } from "react";
import { IconChevronDownLine } from "@karrotmarket/react-monochrome-icon";
import { Icon } from "@seed-design/react";
import { ActionButton } from "seed-design/ui/action-button";
import { BottomSheetBody, BottomSheetContent, BottomSheetFooter, BottomSheetRoot, BottomSheetTrigger } from "seed-design/ui/bottom-sheet";
import { Chip } from "seed-design/ui/chip";
import { LoadingIndicator } from "./LoadingIndicator";
import type { AnimalFeedFilters } from "./useAnimalFeed";
import { AllAnimalFilters } from "./AllAnimalFilters";

const statusOptions = [["all", "모든 보호 동물", "현재 보호 중인 친구를 모두 볼 수 있어요."], ["checking", "입양 상담 가능", "보호자 확인이 끝나 상담을 시작할 수 있어요."], ["notice", "보호자 확인 공고 중", "보호자를 찾는 절차가 진행 중인 친구예요."]] as const;
const sortOptions = [["distance", "가까운 보호소 순", "내 동네에서 가까운 보호소부터 볼 수 있어요."], ["recent", "최근 등록순", "새로 등록된 친구부터 볼 수 있어요."]] as const;

function SimpleOptionSheet({ title, description, value, options, active, onChange, onReset }: { title: string; description: string; value: string; options: readonly (readonly [string, string, string])[]; active: boolean; onChange: (value: string) => void; onReset: () => void }) {
  const [open, setOpen] = useState(false);
  return <BottomSheetRoot open={open} onOpenChange={setOpen}><BottomSheetTrigger asChild><Chip.Button className="ff-animal-filter-chip" variant="outlineWeak" size="medium" data-checked={active || undefined}><Chip.Label>{title === "정렬 기준" ? value === "recent" ? "최근 등록순" : "가까운 순" : "보호 단계"}</Chip.Label><Chip.SuffixIcon><Icon svg={<IconChevronDownLine />} /></Chip.SuffixIcon></Chip.Button></BottomSheetTrigger><BottomSheetContent title={title} description={description}><BottomSheetBody className="ff-status-filter-body"><div className="ff-status-options" role="listbox" aria-label={title}>{options.map(([optionValue, label, optionDescription]) => <button className="ff-status-option" type="button" key={optionValue} role="option" aria-selected={value === optionValue} onClick={() => { onChange(optionValue); setOpen(false); }}><span><strong>{label}</strong><small>{optionDescription}</small></span>{value === optionValue && <b aria-hidden>✓</b>}</button>)}</div></BottomSheetBody>{active && <BottomSheetFooter><ActionButton variant="neutralWeak" onClick={() => { onReset(); setOpen(false); }}>선택 해제</ActionButton></BottomSheetFooter>}</BottomSheetContent></BottomSheetRoot>;
}

function ColorFilterSheet({ value, onChange, onReset }: { value: string; onChange: (value: string) => void; onReset: () => void }) {
  const [open, setOpen] = useState(false), [colors, setColors] = useState<string[]>([]);
  useEffect(() => {
    if (!open || colors.length) return;
    fetch("/api/animal-filter-options").then(response => response.json()).then(body => setColors(Array.isArray(body.colors) ? body.colors : []));
  }, [colors.length, open]);
  const loading = open && colors.length === 0;
  return <BottomSheetRoot open={open} onOpenChange={setOpen}><BottomSheetTrigger asChild><Chip.Button className="ff-animal-filter-chip" variant="outlineWeak" size="medium" data-checked={value !== "all" || undefined}><Chip.Label>털색</Chip.Label><Chip.SuffixIcon><Icon svg={<IconChevronDownLine />} /></Chip.SuffixIcon></Chip.Button></BottomSheetTrigger><BottomSheetContent title="털색" description="공공데이터에 등록된 털색으로 찾아볼 수 있어요."><BottomSheetBody className="ff-color-filter-body">{loading ? <LoadingIndicator label="털색을 불러오는 중" /> : <div className="ff-color-palette" role="listbox" aria-label="털색"><button className="ff-color-option" type="button" data-color="all" role="option" aria-selected={value === "all"} onClick={() => { onReset(); setOpen(false); }}><span className="ff-color-swatch" aria-hidden /><strong>모든 털색</strong>{value === "all" && <b aria-hidden>✓</b>}</button>{colors.map(color => <button className="ff-color-option" type="button" key={color} data-color={color} role="option" aria-selected={value === color} onClick={() => { onChange(color); setOpen(false); }}><span className="ff-color-swatch" aria-hidden /><strong>{color}</strong>{value === color && <b aria-hidden>✓</b>}</button>)}</div>}</BottomSheetBody>{value !== "all" && <BottomSheetFooter><ActionButton variant="neutralWeak" onClick={() => { onReset(); setOpen(false); }}>선택 해제</ActionButton></BottomSheetFooter>}</BottomSheetContent></BottomSheetRoot>;
}

export function AnimalFilterBar({ filters, hasLocation, activeCount, setFilter, resetFilters }: { filters: AnimalFeedFilters; location: { lat: number; lng: number } | null; hasLocation: boolean; activeCount: number; setFilter: <K extends keyof AnimalFeedFilters>(key: K, value: AnimalFeedFilters[K]) => void; resetFilters: () => void }) {
  const sortValue = hasLocation ? filters.sort : "recent";
  return <div className="ff-animal-filter-wrap" aria-label="보호동물 목록 필터"><div className="ff-animal-filter-scroll"><AllAnimalFilters activeCount={activeCount} filters={filters} setFilter={setFilter} resetFilters={resetFilters}/><SimpleOptionSheet title="정렬 기준" description="가까운 보호소 또는 최근 등록된 순서로 볼 수 있어요." value={sortValue} options={sortOptions} active={sortValue === "recent"} onChange={value => setFilter("sort", value as AnimalFeedFilters["sort"])} onReset={() => setFilter("sort", "distance")}/><SimpleOptionSheet title="보호 단계" description="현재 보호 절차에 따라 친구를 골라볼 수 있어요." value={filters.publicStatus} options={statusOptions} active={filters.publicStatus !== "all"} onChange={value => setFilter("publicStatus", value as AnimalFeedFilters["publicStatus"])} onReset={() => setFilter("publicStatus", "all")}/><ColorFilterSheet value={filters.color} onChange={value => setFilter("color", value)} onReset={() => setFilter("color", "all")}/>{activeCount > 0 && <Chip.Button className="ff-animal-filter-reset" variant="outlineWeak" size="medium" onClick={resetFilters}><Chip.Label>전체 초기화</Chip.Label></Chip.Button>}</div></div>;
}
