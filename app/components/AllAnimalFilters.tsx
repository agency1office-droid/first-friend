/* eslint-disable react-hooks/set-state-in-effect -- opening the panel starts its lazy options request */
"use client";

import { useEffect, useState } from "react";
import type { Dispatch, SetStateAction } from "react";
import { IconCalendarLine, IconCheckmarkScaleLine, IconChevronLeftLine, IconLocationpinLine, IconMalesymbolFemalesymbolLine, IconPaletteLine, IconPawprintLine, IconPersonShieldLine, IconSlider2HorizontalLine, IconXmarkLine } from "@karrotmarket/react-monochrome-icon";
import { Icon } from "@seed-design/react";
import { ActionButton } from "seed-design/ui/action-button";
import { Checkbox } from "seed-design/ui/checkbox";
import { Chip } from "seed-design/ui/chip";
import { TextField, TextFieldInput } from "seed-design/ui/text-field";
import { LoadingIndicator } from "./LoadingIndicator";
import type { AnimalFeedFilters } from "./useAnimalFeed";

type Options = { species: string[]; breeds: { key: string; label: string; species: string }[]; sex: string[]; colors: string[]; ages: string[]; weights: string[]; states: string[]; regions: string[] };
type Props = { activeCount: number; filters: AnimalFeedFilters; setFilter: <K extends keyof AnimalFeedFilters>(key: K, value: AnimalFeedFilters[K]) => void; resetFilters: () => void };

const humanize = (value: string) => value.replace(/\s+/g, " ").trim();

function ChoiceGrid({ values, selected, onToggle, className = "", icon }: { values: string[]; selected: string[]; onToggle: (value: string) => void; className?: string; icon?: React.ReactNode }) {
  return <div className={`ff-filter-choice-grid ${className}`}>{values.map(value => <button type="button" key={value} className="ff-filter-choice" data-selected={selected.includes(value) || undefined} onClick={() => onToggle(value)} aria-pressed={selected.includes(value)}>{icon && <span className="ff-filter-choice-icon" aria-hidden>{icon}</span>}<span>{humanize(value)}</span></button>)}</div>;
}

function SectionHeading({ title, action, count, icon }: { title: string; action?: React.ReactNode; count?: string; icon?: React.ReactNode }) {
  return <div className="ff-filter-section-heading">{icon && <span className="ff-filter-section-icon" aria-hidden>{icon}</span>}<h2>{title}</h2>{count && <span className="ff-filter-section-count">{count}</span>}{action}</div>;
}

export function AllAnimalFilters({ activeCount, filters, setFilter, resetFilters }: Props) {
  const [open, setOpen] = useState(false), [loading, setLoading] = useState(false), [error, setError] = useState(""), [options, setOptions] = useState<Options | null>(null);
  const [species, setSpecies] = useState<string[]>([]), [breeds, setBreeds] = useState<string[]>([]), [sex, setSex] = useState<string[]>([]), [colors, setColors] = useState<string[]>([]), [ages, setAges] = useState<string[]>([]), [weights, setWeights] = useState<string[]>([]), [states, setStates] = useState<string[]>([]), [regions, setRegions] = useState<string[]>([]);
  const [showAllBreeds, setShowAllBreeds] = useState(false), [showColors, setShowColors] = useState(false), [showStates, setShowStates] = useState(false), [showRegions, setShowRegions] = useState(false), [breedQuery, setBreedQuery] = useState("");
  const toggle = (setter: Dispatch<SetStateAction<string[]>>) => (value: string) => setter(current => current.includes(value) ? current.filter(item => item !== value) : [...current, value]);
  const match = (value: string, query: string) => !query.trim() || value.toLocaleLowerCase("ko-KR").includes(query.trim().toLocaleLowerCase("ko-KR"));

  const openPanel = () => {
    setSpecies(filters.species === "cat" ? ["고양이"] : filters.species === "dog" ? ["개"] : []);
    setBreeds(filters.breedKeys); setSex(filters.sex === "female" ? ["암컷"] : filters.sex === "male" ? ["수컷"] : []); setColors(filters.color === "all" ? [] : [filters.color]);
    setAges([]); setWeights([]); setStates([]); setRegions([]); setShowAllBreeds(false); setShowColors(false); setShowStates(false); setShowRegions(false); setBreedQuery(""); setError(""); setOpen(true);
  };
  useEffect(() => {
    if (!open || options) return;
    setLoading(true); fetch("/api/animal-filter-options").then(async response => { const body = await response.json(); if (!response.ok) throw new Error(body.error || "공공 API 필터를 불러오지 못했어요."); setOptions(body); }).catch(value => setError(value instanceof Error ? value.message : "공공 API 필터를 불러오지 못했어요.")).finally(() => setLoading(false));
  }, [open, options]);
  const apply = () => {
    const selectedSpecies = species.length === 1 && /고양이/.test(species[0]) ? "cat" : species.length === 1 && /개|강아지/.test(species[0]) ? "dog" : "all";
    const selectedSex = sex.length === 1 && sex[0] === "암컷" ? "female" : sex.length === 1 && sex[0] === "수컷" ? "male" : "all";
    setFilter("species", selectedSpecies); setFilter("sex", selectedSex); setFilter("color", colors.length === 1 ? colors[0] : "all"); setFilter("breedKeys", breeds.slice(0, 10)); setOpen(false);
  };
  const clearDraft = () => { setSpecies([]); setBreeds([]); setSex([]); setColors([]); setAges([]); setWeights([]); setStates([]); setRegions([]); resetFilters(); };
  const applied = [...species, ...breeds, ...sex, ...colors].slice(0, 6);
  const visibleBreeds = options?.breeds.filter(item => match(item.label, breedQuery)) ?? [];

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
          <section className="ff-filter-reference-section"><SectionHeading title="품종" icon={<IconPawprintLine />} action={<button type="button" className="ff-filter-text-action" onClick={() => setShowAllBreeds(value => !value)}>{showAllBreeds ? "접기" : "전체 보기"}</button>} count={breeds.length ? `${breeds.length}개 선택` : undefined} />{showAllBreeds && <TextField className="ff-filter-search"><TextFieldInput value={breedQuery} onChange={event => setBreedQuery(event.target.value)} placeholder="품종을 검색해보세요" /></TextField>}<div className="ff-filter-breed-list">{visibleBreeds.slice(0, showAllBreeds ? 80 : 3).map(item => <Checkbox key={item.key} checked={breeds.includes(item.key)} onCheckedChange={() => toggle(setBreeds)(item.key)} label={<span>{item.label}<small>{item.species}</small></span>} />)}</div></section>
          <section className="ff-filter-reference-section"><SectionHeading title="나이" icon={<IconCalendarLine />} count={ages.length ? `${ages.length}개 선택` : undefined} /><ChoiceGrid values={options.ages} selected={ages} onToggle={toggle(setAges)} icon={<IconCalendarLine />} /></section>
          <section className="ff-filter-reference-section"><SectionHeading title="체중" icon={<IconCheckmarkScaleLine />} count={weights.length ? `${weights.length}개 선택` : undefined} /><ChoiceGrid values={options.weights} selected={weights} onToggle={toggle(setWeights)} className="is-size" icon={<IconCheckmarkScaleLine />} /></section>
          <section className="ff-filter-reference-section"><SectionHeading title="성별" icon={<IconMalesymbolFemalesymbolLine />} count={sex.length ? `${sex.length}개 선택` : undefined} /><ChoiceGrid values={options.sex} selected={sex} onToggle={toggle(setSex)} icon={<IconMalesymbolFemalesymbolLine />} /></section>
          <section className="ff-filter-reference-section"><SectionHeading title="털색" icon={<IconPaletteLine />} action={<button type="button" className="ff-filter-text-action" onClick={() => setShowColors(value => !value)}>{showColors ? "접기" : "전체 보기"}</button>} count={colors.length ? `${colors.length}개 선택` : undefined} /><ChoiceGrid values={showColors ? options.colors : options.colors.slice(0, 12)} selected={colors} onToggle={toggle(setColors)} /></section>
          <section className="ff-filter-reference-section"><SectionHeading title="보호 상태" icon={<IconPersonShieldLine />} action={<button type="button" className="ff-filter-text-action" onClick={() => setShowStates(value => !value)}>{showStates ? "접기" : "전체 보기"}</button>} count={states.length ? `${states.length}개 선택` : undefined} /><ChoiceGrid values={showStates ? options.states : options.states.slice(0, 12)} selected={states} onToggle={toggle(setStates)} /></section>
          <section className="ff-filter-reference-section"><SectionHeading title="발견 지역" icon={<IconLocationpinLine />} action={<button type="button" className="ff-filter-text-action" onClick={() => setShowRegions(value => !value)}>{showRegions ? "접기" : "전체 보기"}</button>} count={regions.length ? `${regions.length}개 선택` : undefined} /><ChoiceGrid values={showRegions ? options.regions : options.regions.slice(0, 12)} selected={regions} onToggle={toggle(setRegions)} /></section>
        </>}
      </div>
      <footer className="ff-filter-reference-footer"><ActionButton onClick={apply}>선택 조건 적용{applied.length ? ` · ${applied.length}개` : ""}</ActionButton></footer>
    </div>}
  </>;
}
