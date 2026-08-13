/* eslint-disable react-hooks/set-state-in-effect -- opening the panel starts its lazy options request */
"use client";

import { useEffect, useState } from "react";
import type { Dispatch, SetStateAction } from "react";
import { IconCalendarLine, IconCheckmarkScaleLine, IconChevronLeftLine, IconMalesymbolFemalesymbolLine, IconPaletteLine, IconPawprintLine, IconSlider2HorizontalLine, IconXmarkLine } from "@karrotmarket/react-monochrome-icon";
import { Icon } from "@seed-design/react";
import { ActionButton } from "seed-design/ui/action-button";
import { Checkbox } from "seed-design/ui/checkbox";
import { Chip } from "seed-design/ui/chip";
import { TextField, TextFieldInput } from "seed-design/ui/text-field";
import { LoadingIndicator } from "./LoadingIndicator";
import type { AnimalFeedFilters } from "./useAnimalFeed";

type Options = { species: string[]; breeds: { key: string; label: string; species: string; count: number }[]; sex: string[]; colors: string[] };
type Props = { activeCount: number; filters: AnimalFeedFilters; setFilter: <K extends keyof AnimalFeedFilters>(key: K, value: AnimalFeedFilters[K]) => void; resetFilters: () => void };

const humanize = (value: string) => value.replace(/\s+/g, " ").trim();

function ChoiceGrid({ values, selected, onToggle, className = "", icon }: { values: string[]; selected: string[]; onToggle: (value: string) => void; className?: string; icon?: React.ReactNode }) {
  return <div className={`ff-filter-choice-grid ${className}`}>{values.map(value => <button type="button" key={value} className="ff-filter-choice" data-selected={selected.includes(value) || undefined} onClick={() => onToggle(value)} aria-pressed={selected.includes(value)}>{icon && <span className="ff-filter-choice-icon" aria-hidden>{icon}</span>}<span>{humanize(value)}</span></button>)}</div>;
}

function SectionHeading({ title, action, count, icon }: { title: string; action?: React.ReactNode; count?: string; icon?: React.ReactNode }) {
  return <div className="ff-filter-section-heading">{icon && <span className="ff-filter-section-icon" aria-hidden>{icon}</span>}<h2>{title}</h2>{count && <span className="ff-filter-section-count">{count}</span>}{action}</div>;
}

function SnapRange({ label, value, options, onChange, icon }: { label: string; value: string; options: { value: string; label: string }[]; onChange: (value: string) => void; icon: React.ReactNode }) {
  const selected = Math.max(0, options.findIndex(item => item.value === value));
  return <div className="ff-filter-range"><div className="ff-filter-range-value"><span>{icon}</span><strong>{options[selected]?.label}</strong></div><input aria-label={label} type="range" min="0" max={options.length - 1} step="1" value={selected} onChange={event => onChange(options[Number(event.target.value)].value)} /><div className="ff-filter-range-ticks">{options.map(item => <span key={item.value} data-selected={item.value === value || undefined}>{item.label}</span>)}</div></div>;
}

export function AllAnimalFilters({ activeCount, filters, setFilter, resetFilters }: Props) {
  const [open, setOpen] = useState(false), [loading, setLoading] = useState(false), [error, setError] = useState(""), [options, setOptions] = useState<Options | null>(null);
  const [species, setSpecies] = useState<string[]>([]), [breeds, setBreeds] = useState<string[]>([]), [sex, setSex] = useState<string[]>([]), [colors, setColors] = useState<string[]>([]), [ageGroup, setAgeGroup] = useState("all"), [sizeGroup, setSizeGroup] = useState("all");
  const [showAllBreeds, setShowAllBreeds] = useState(false), [showColors, setShowColors] = useState(false), [breedQuery, setBreedQuery] = useState("");
  const toggle = (setter: Dispatch<SetStateAction<string[]>>) => (value: string) => setter(current => current.includes(value) ? current.filter(item => item !== value) : [...current, value]);
  const match = (value: string, query: string) => !query.trim() || value.toLocaleLowerCase("ko-KR").includes(query.trim().toLocaleLowerCase("ko-KR"));

  const openPanel = () => {
    setSpecies(filters.species === "cat" ? ["고양이"] : filters.species === "dog" ? ["개"] : []);
    setBreeds(filters.breedKeys); setSex(filters.sex === "female" ? ["암컷"] : filters.sex === "male" ? ["수컷"] : []); setColors(filters.color === "all" ? [] : [filters.color]);
    setAgeGroup(filters.ageGroup); setSizeGroup(filters.sizeGroup); setShowAllBreeds(false); setShowColors(false); setBreedQuery(""); setError(""); setOpen(true);
  };
  useEffect(() => {
    if (!open || options) return;
    setLoading(true); fetch("/api/animal-filter-options").then(async response => { const body = await response.json(); if (!response.ok) throw new Error(body.error || "공공 API 필터를 불러오지 못했어요."); setOptions(body); }).catch(value => setError(value instanceof Error ? value.message : "공공 API 필터를 불러오지 못했어요.")).finally(() => setLoading(false));
  }, [open, options]);
  const apply = () => {
    const selectedSpecies = species.length === 1 && /고양이/.test(species[0]) ? "cat" : species.length === 1 && /개|강아지/.test(species[0]) ? "dog" : "all";
    const selectedSex = sex.length === 1 && sex[0] === "암컷" ? "female" : sex.length === 1 && sex[0] === "수컷" ? "male" : "all";
    setFilter("species", selectedSpecies); setFilter("sex", selectedSex); setFilter("color", colors.length === 1 ? colors[0] : "all"); setFilter("breedKeys", breeds.slice(0, 10)); setFilter("ageGroup", ageGroup as AnimalFeedFilters["ageGroup"]); setFilter("sizeGroup", sizeGroup as AnimalFeedFilters["sizeGroup"]); setOpen(false);
  };
  const clearDraft = () => { setSpecies([]); setBreeds([]); setSex([]); setColors([]); setAgeGroup("all"); setSizeGroup("all"); resetFilters(); };
  const ageOptions = [{ value: "all", label: "모든 나이" }, { value: "young", label: "어린 친구" }, { value: "adult", label: "어른 친구" }, { value: "unknown", label: "나이 미상" }];
  const sizeOptions = [{ value: "all", label: "모든 체중" }, { value: "small", label: "소형" }, { value: "medium", label: "중형" }, { value: "large", label: "대형" }, { value: "unknown", label: "미상" }];
  const applied = [...species, ...breeds, ...sex, ...colors, ageOptions.find(item => item.value === ageGroup)?.label || "", sizeOptions.find(item => item.value === sizeGroup)?.label || ""].filter(value => value && !/모든 /.test(value)).slice(0, 8);
  const visibleBreeds = options?.breeds.filter(item => (species.length === 0 || (species[0] === "고양이" ? item.species === "고양이" : item.species !== "고양이")) && match(item.label, breedQuery)) ?? [];

  return <>
    <Chip.Button className="ff-all-filter-trigger" variant="outlineWeak" size="medium" onClick={openPanel} aria-label={activeCount > 0 ? `전체 필터 열기, ${activeCount}개 선택됨` : "전체 필터 열기"} data-checked={activeCount > 0 || undefined}><Chip.PrefixIcon><Icon svg={<IconSlider2HorizontalLine />} /></Chip.PrefixIcon>{activeCount > 0 && <span className="ff-all-filter-count">{activeCount}</span>}</Chip.Button>
    {open && <div className="ff-all-filter-overlay" role="dialog" aria-modal="true" aria-label="전체 필터">
      <header className="ff-filter-reference-header"><button type="button" onClick={() => setOpen(false)} aria-label="필터 닫기"><IconChevronLeftLine aria-hidden /></button><h1>친구 찾기</h1><button type="button" onClick={clearDraft}>전체 초기화</button></header>
      <div className="ff-all-filter-content ff-filter-reference-content">
        {loading && <div className="ff-all-filter-loading"><LoadingIndicator label="필터를 불러오는 중" /></div>}
        {error && <p className="ff-all-filter-error">{error}</p>}
        {options && <>
          <section className="ff-filter-applied"><SectionHeading title="선택한 조건" icon={<IconCheckmarkScaleLine />} />{applied.length ? <div className="ff-filter-applied-list">{applied.map(value => <button type="button" key={value} onClick={() => { if (species.includes(value)) toggle(setSpecies)(value); else if (breeds.includes(value)) toggle(setBreeds)(value); else if (sex.includes(value)) toggle(setSex)(value); else toggle(setColors)(value); }}>{value}<IconXmarkLine aria-hidden /></button>)}</div> : <p>아직 선택한 조건이 없어요.</p>}</section>
          <section className="ff-filter-reference-section"><SectionHeading title="동물 종류" icon={<IconPawprintLine />} count={species.length ? `${species.length}개 선택` : undefined} /><ChoiceGrid values={options.species} selected={species} onToggle={toggle(setSpecies)} /></section>
          <section className="ff-filter-reference-section"><SectionHeading title="품종" icon={<IconPawprintLine />} action={<button type="button" className="ff-filter-text-action" disabled={!species.length} onClick={() => setShowAllBreeds(value => !value)}>{!species.length ? "동물 종류를 먼저 선택" : showAllBreeds ? "접기" : "전체 보기"}</button>} count={breeds.length ? `${breeds.length}개 선택` : undefined} />{species.length > 0 && showAllBreeds && <TextField className="ff-filter-search"><TextFieldInput value={breedQuery} onChange={event => setBreedQuery(event.target.value)} placeholder="품종을 검색해보세요" /></TextField>}<div className="ff-filter-breed-list">{species.length > 0 ? visibleBreeds.slice(0, showAllBreeds ? 80 : 3).map(item => <Checkbox key={item.key} checked={breeds.includes(item.key)} onCheckedChange={() => toggle(setBreeds)(item.key)} label={<span>{item.label}<small>{item.count.toLocaleString("ko-KR")}마리 · {item.species}</small></span>} />) : <p className="ff-filter-disabled-copy">먼저 동물 종류를 선택하면 품종을 고를 수 있어요.</p>}</div></section>
          <section className="ff-filter-reference-section"><SectionHeading title="나이" icon={<IconCalendarLine />} count={ageGroup !== "all" ? "선택됨" : undefined} /><SnapRange label="나이" value={ageGroup} options={ageOptions} onChange={setAgeGroup} icon={<IconCalendarLine />} /></section>
          <section className="ff-filter-reference-section"><SectionHeading title="체중" icon={<IconCheckmarkScaleLine />} count={sizeGroup !== "all" ? "선택됨" : undefined} /><SnapRange label="체중" value={sizeGroup} options={sizeOptions} onChange={setSizeGroup} icon={<IconCheckmarkScaleLine />} /></section>
          <section className="ff-filter-reference-section"><SectionHeading title="성별" icon={<IconMalesymbolFemalesymbolLine />} count={sex.length ? `${sex.length}개 선택` : undefined} /><ChoiceGrid values={options.sex} selected={sex} onToggle={toggle(setSex)} icon={<IconMalesymbolFemalesymbolLine />} /></section>
          <section className="ff-filter-reference-section"><SectionHeading title="털색" icon={<IconPaletteLine />} action={<button type="button" className="ff-filter-text-action" onClick={() => setShowColors(value => !value)}>{showColors ? "접기" : "전체 보기"}</button>} count={colors.length ? `${colors.length}개 선택` : undefined} /><ChoiceGrid values={showColors ? options.colors : options.colors.slice(0, 12)} selected={colors} onToggle={toggle(setColors)} /></section>
        </>}
      </div>
      <footer className="ff-filter-reference-footer"><ActionButton onClick={apply}>선택 조건 적용{applied.length ? ` · ${applied.length}개` : ""}</ActionButton></footer>
    </div>}
  </>;
}
