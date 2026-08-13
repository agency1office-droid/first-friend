/* eslint-disable react-hooks/set-state-in-effect -- opening the panel starts its lazy options request */
"use client";

import { useEffect, useMemo, useState } from "react";
import { IconCalendarLine, IconCheckmarkScaleLine, IconChevronLeftLine, IconChevronDownLine, IconCheckmarkLine, IconMalesymbolFemalesymbolLine, IconPawprintLine, IconSlider2HorizontalLine, IconXmarkLine } from "@karrotmarket/react-monochrome-icon";
import { Icon } from "@seed-design/react";
import { ActionButton } from "seed-design/ui/action-button";
import { Checkbox } from "seed-design/ui/checkbox";
import { Chip } from "seed-design/ui/chip";
import { TextField, TextFieldInput } from "seed-design/ui/text-field";
import { LoadingIndicator } from "./LoadingIndicator";
import type { AnimalFeedFilters } from "./useAnimalFeed";

type Options = { species: string[]; breeds: { key: string; label: string; species: string; count: number }[]; sex: string[] };
type Props = { activeCount: number; filters: AnimalFeedFilters; setFilter: <K extends keyof AnimalFeedFilters>(key: K, value: AnimalFeedFilters[K]) => void; resetFilters: () => void };

const humanize = (value: string) => value.replace(/\s+/g, " ").trim();
const normalizedSpecies = (value: string) => value === "cat" || value === "고양이" ? "cat" : "dog";
const sexOrder = (value: string) => value === "수컷" ? 0 : value === "암컷" ? 1 : 2;

function SectionHeading({ title, action, count, icon }: { title: string; action?: React.ReactNode; count?: string; icon?: React.ReactNode }) {
  return <div className="ff-filter-section-heading">{icon && <span className="ff-filter-section-icon" aria-hidden>{icon}</span>}<h2>{title}</h2>{count && <span className="ff-filter-section-count">{count}</span>}{action}</div>;
}

function SnapRange({ label, point, max, unit, ticks, onChange, icon }: { label: string; point: number; max: number; unit: string; ticks: number[]; onChange: (point: number) => void; icon: React.ReactNode }) {
  const selected = point === 0 ? null : point - 1;
  return <div className="ff-filter-range">
    <div className="ff-filter-range-value"><span>{icon}</span><strong>{selected === null ? `모든 ${label}` : `${selected}${unit} 이하`}</strong></div>
    <input aria-label={`${label} 선택`} type="range" min="0" max={max + 1} step="1" value={point} onChange={event => onChange(Number(event.target.value))} />
    <div className="ff-filter-range-ticks"><span data-selected={point === 0 || undefined}>전체</span>{ticks.map(item => <span key={item} data-selected={selected === item || undefined}>{item}{unit}</span>)}</div>
  </div>;
}

const sexIcon = (value: string) => value === "수컷" ? "♂" : value === "암컷" ? "♀" : "◌";

export function AllAnimalFilters({ activeCount, filters, setFilter, resetFilters }: Props) {
  const [open, setOpen] = useState(false), [loading, setLoading] = useState(false), [error, setError] = useState(""), [options, setOptions] = useState<Options | null>(null);
  const [species, setSpecies] = useState<AnimalFeedFilters["species"]>(filters.species), [breeds, setBreeds] = useState<string[]>(filters.breedKeys), [sex, setSex] = useState<string[]>([]), [neutered, setNeutered] = useState<string[]>([]);
  const [ageRange, setAgeRange] = useState<[number, number]>([0, 20]), [weightRange, setWeightRange] = useState<[number, number]>([0, 50]), [agePoint, setAgePoint] = useState(0), [weightPoint, setWeightPoint] = useState(0), [breedQuery, setBreedQuery] = useState(""), [showBreeds, setShowBreeds] = useState(false);
  const toggle = (setter: React.Dispatch<React.SetStateAction<string[]>>) => (value: string) => setter(current => current.includes(value) ? current.filter(item => item !== value) : [...current, value]);
  const openPanel = () => {
    setSpecies(filters.species); setBreeds(filters.breedKeys); setSex(filters.sex === "female" ? ["암컷"] : filters.sex === "male" ? ["수컷"] : []); setNeutered(filters.neutered === "all" ? [] : [filters.neutered === "yes" ? "중성화 완료" : "중성화 안 됨"]);
    const nextAge = filters.ageMin === 0 && filters.ageMax === 20 ? 0 : Math.min(21, filters.ageMax + 1);
    const nextWeight = filters.weightMin === 0 && filters.weightMax === 50 ? 0 : Math.min(51, filters.weightMax + 1);
    setAgeRange(nextAge === 0 ? [0, 20] : [0, nextAge - 1]); setWeightRange(nextWeight === 0 ? [0, 50] : [0, nextWeight - 1]); setAgePoint(nextAge); setWeightPoint(nextWeight); setBreedQuery(""); setShowBreeds(Boolean(filters.species !== "all")); setError(""); setOpen(true);
  };
  useEffect(() => {
    if (!open || options) return;
    setLoading(true); fetch("/api/animal-filter-options").then(async response => { const body = await response.json(); if (!response.ok) throw new Error(body.error || "필터를 불러오지 못했어요."); setOptions(body); }).catch(value => setError(value instanceof Error ? value.message : "필터를 불러오지 못했어요.")).finally(() => setLoading(false));
  }, [open, options]);
  useEffect(() => {
    if (!open) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = previousOverflow; };
  }, [open]);
  const visibleBreeds = useMemo(() => options?.breeds.filter(item => (species === "all" || normalizedSpecies(item.species) === species) && (!breedQuery.trim() || item.label.toLocaleLowerCase("ko-KR").includes(breedQuery.trim().toLocaleLowerCase("ko-KR")))) || [], [breedQuery, options, species]);
  const apply = () => {
    const ageGroup = "all";
    const sizeGroup = "all";
    setFilter("species", species); setFilter("breedKeys", breeds.slice(0, 10)); setFilter("sex", sex[0] === "암컷" ? "female" : sex[0] === "수컷" ? "male" : "all"); setFilter("neutered", neutered[0] === "중성화 완료" ? "yes" : neutered[0] === "중성화 안 됨" ? "no" : "all"); setFilter("ageGroup", ageGroup); setFilter("sizeGroup", sizeGroup); setFilter("ageMin", ageRange[0]); setFilter("ageMax", ageRange[1]); setFilter("weightMin", weightRange[0]); setFilter("weightMax", weightRange[1]); setOpen(false);
  };
  const clearDraft = () => { setSpecies("all"); setBreeds([]); setSex([]); setNeutered([]); setAgeRange([0, 20]); setWeightRange([0, 50]); setAgePoint(0); setWeightPoint(0); resetFilters(); };
  const applied = [
    ...(species !== "all" ? [{ key: "species", label: species === "cat" ? "고양이" : "강아지" }] : []),
    ...breeds.map(key => ({ key: `breed:${key}`, label: options?.breeds.find(item => item.key === key)?.label || "선택한 품종" })),
    ...(sex.map(value => ({ key: `sex:${value}`, label: value }))), ...(neutered.map(value => ({ key: `neutered:${value}`, label: value }))),
    ...((ageRange[0] !== 0 || ageRange[1] !== 20) ? [{ key: "age", label: `나이 ${ageRange[0]}~${ageRange[1]}살` }] : []), ...((weightRange[0] !== 0 || weightRange[1] !== 50) ? [{ key: "weight", label: `체중 ${weightRange[0]}~${weightRange[1]}kg` }] : []),
  ];
  const removeApplied = (key: string) => { if (key === "species") { setSpecies("all"); setBreeds([]); } else if (key.startsWith("breed:")) setBreeds(current => current.filter(item => `breed:${item}` !== key)); else if (key.startsWith("sex:")) setSex([]); else if (key.startsWith("neutered:")) setNeutered([]); else if (key === "age") setAgeRange([0, 20]); else if (key === "weight") setWeightRange([0, 50]); };

  return <>
    <Chip.Button className="ff-all-filter-trigger" variant="outlineWeak" size="medium" onClick={openPanel} aria-label="전체 필터 열기" data-checked={activeCount > 0 || undefined}><Chip.PrefixIcon><Icon svg={<IconSlider2HorizontalLine />} /></Chip.PrefixIcon>{activeCount > 0 && <span className="ff-all-filter-count">{activeCount}</span>}</Chip.Button>
    {open && <div className="ff-all-filter-overlay" role="dialog" aria-modal="true" aria-label="전체 필터">
      <header className="ff-filter-reference-header"><button type="button" onClick={() => setOpen(false)} aria-label="필터 닫기"><IconChevronLeftLine aria-hidden /></button><h1>친구 찾기</h1><button type="button" onClick={clearDraft}>전체 초기화</button></header>
      <div className="ff-all-filter-content ff-filter-reference-content">
        {loading && <div className="ff-all-filter-loading"><LoadingIndicator label="필터를 불러오는 중" /></div>}{error && <p className="ff-all-filter-error">{error}</p>}{options && <>
          <section className="ff-filter-applied"><SectionHeading title="선택한 조건" icon={<IconCheckmarkScaleLine />} />{applied.length ? <div className="ff-filter-applied-list">{applied.map(item => <button type="button" key={item.key} onClick={() => removeApplied(item.key)}>{item.label}<IconXmarkLine aria-hidden /></button>)}</div> : <p>아직 선택한 조건이 없어요.</p>}</section>
          <section className="ff-filter-reference-section"><SectionHeading title="동물 종류 · 품종" icon={<IconPawprintLine />} /><div className="ff-filter-species-grid">{(["dog", "cat"] as const).map(value => <button type="button" key={value} className="ff-filter-species-card" data-selected={species === value || undefined} onClick={() => { setSpecies(value); setShowBreeds(true); setBreeds(current => current.filter(key => { const breed = options.breeds.find(item => item.key === key); return !breed || normalizedSpecies(breed.species) === value; })); }}><span className="ff-filter-species-illustration" aria-hidden>{value === "dog" ? "🐶" : "🐱"}</span><strong>{value === "dog" ? "강아지" : "고양이"}</strong><small>{options.breeds.filter(item => normalizedSpecies(item.species) === value).reduce((sum, item) => sum + item.count, 0).toLocaleString("ko-KR")}마리</small></button>)}</div>{showBreeds && <><div className="ff-filter-breed-toolbar"><strong>{species === "cat" ? "고양이" : "강아지"} 품종</strong><button type="button" onClick={() => setShowBreeds(false)} aria-label="품종 접기"><Icon svg={<IconChevronDownLine />} /></button></div><TextField className="ff-filter-search"><TextFieldInput value={breedQuery} onChange={event => setBreedQuery(event.target.value)} placeholder="품종을 검색해보세요" /></TextField><div className="ff-filter-breed-list">{visibleBreeds.slice(0, 100).map(item => <Checkbox key={item.key} checked={breeds.includes(item.key)} onCheckedChange={() => toggle(setBreeds)(item.key)} label={<span className="ff-breed-filter-label"><strong>{humanize(item.label)}</strong><small>{item.count.toLocaleString("ko-KR")}마리</small></span>} />)}</div></>}</section>
          <section className="ff-filter-reference-section"><SectionHeading title="나이" icon={<IconCalendarLine />} /><SnapRange label="나이" point={agePoint} max={20} unit="살" ticks={[0, 5, 10, 15, 20]} onChange={point => { setAgePoint(point); setAgeRange(point === 0 ? [0, 20] : [0, point - 1]); }} icon={<IconCalendarLine />} /></section>
          <section className="ff-filter-reference-section"><SectionHeading title="체중" icon={<IconCheckmarkScaleLine />} /><SnapRange label="체중" point={weightPoint} max={50} unit="kg" ticks={[0, 10, 20, 30, 40, 50]} onChange={point => { setWeightPoint(point); setWeightRange(point === 0 ? [0, 50] : [0, point - 1]); }} icon={<IconCheckmarkScaleLine />} /></section>
          <section className="ff-filter-reference-section"><SectionHeading title="성별" icon={<IconMalesymbolFemalesymbolLine />} /><div className="ff-filter-choice-grid">{[...options.sex].sort((a, b) => sexOrder(a) - sexOrder(b)).map(value => <button type="button" key={value} className="ff-filter-choice" data-selected={sex.includes(value) || undefined} onClick={() => { setSex(value === "미상" ? [] : [value]); }}><span className={`ff-filter-choice-icon ff-filter-sex-icon is-${value === "수컷" ? "male" : value === "암컷" ? "female" : "unknown"}`} aria-hidden>{sexIcon(value)}</span><span>{humanize(value)}</span></button>)}</div></section>
          <section className="ff-filter-reference-section"><SectionHeading title="중성화 여부" icon={<IconCheckmarkLine />} /><div className="ff-filter-choice-grid">{[["yes", "중성화 완료"], ["no", "중성화 안 됨"]].map(([value, label]) => <button type="button" key={value} className="ff-filter-choice" data-selected={neutered.includes(label) || undefined} onClick={() => setNeutered(neutered.includes(label) ? [] : [label])}><span className="ff-filter-choice-icon" aria-hidden>✓</span><span>{label}</span></button>)}</div></section>
        </>}
      </div><footer className="ff-filter-reference-footer"><ActionButton onClick={apply}>선택 조건 적용{applied.length ? ` · ${applied.length}개` : ""}</ActionButton></footer>
    </div>}
  </>;
}
