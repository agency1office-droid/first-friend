/* eslint-disable react-hooks/set-state-in-effect -- opening the panel starts its lazy options request */
"use client";

import { useEffect, useState } from "react";
import type { Dispatch, SetStateAction } from "react";
import { IconSlider2HorizontalLine, IconXmarkLine } from "@karrotmarket/react-monochrome-icon";
import { Icon } from "@seed-design/react";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "seed-design/ui/accordion";
import { ActionButton } from "seed-design/ui/action-button";
import { Checkbox } from "seed-design/ui/checkbox";
import { Chip } from "seed-design/ui/chip";
import { TextField, TextFieldInput } from "seed-design/ui/text-field";
import { LoadingIndicator } from "./LoadingIndicator";
import type { AnimalFeedFilters } from "./useAnimalFeed";

type Options = {
  species: string[];
  breeds: { key: string; label: string; species: string }[];
  sex: string[];
  colors: string[];
  ages: string[];
  weights: string[];
  states: string[];
  regions: string[];
};

type Props = {
  activeCount: number;
  filters: AnimalFeedFilters;
  setFilter: <K extends keyof AnimalFeedFilters>(key: K, value: AnimalFeedFilters[K]) => void;
  resetFilters: () => void;
};

function FilterGroup({
  value,
  title,
  values,
  selected,
  onToggle,
  query,
  onQueryChange,
}: {
  value: string;
  title: string;
  values: string[];
  selected: string[];
  onToggle: (value: string) => void;
  query?: string;
  onQueryChange?: (value: string) => void;
}) {
  return (
    <AccordionItem value={value} className="ff-all-filter-group">
      <AccordionTrigger title={title} description={selected.length ? `${selected.length}개 선택됨` : `${values.length.toLocaleString("ko-KR")}개`} />
      <AccordionContent>
        {onQueryChange && <TextField className="ff-all-filter-search"><TextFieldInput value={query ?? ""} onChange={event => onQueryChange(event.target.value)} placeholder={`${title} 검색`} /></TextField>}
        <div className="ff-all-filter-options">
          {values.map(option => <Checkbox key={option} checked={selected.includes(option)} onCheckedChange={() => onToggle(option)} label={option} />)}
          {!values.length && <p className="ff-all-filter-empty">일치하는 항목이 없어요.</p>}
        </div>
      </AccordionContent>
    </AccordionItem>
  );
}

export function AllAnimalFilters({ activeCount, filters, setFilter, resetFilters }: Props) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [options, setOptions] = useState<Options | null>(null);
  const [species, setSpecies] = useState<string[]>([]);
  const [breeds, setBreeds] = useState<string[]>([]);
  const [sex, setSex] = useState<string[]>([]);
  const [colors, setColors] = useState<string[]>([]);
  const [ages, setAges] = useState<string[]>([]);
  const [weights, setWeights] = useState<string[]>([]);
  const [states, setStates] = useState<string[]>([]);
  const [regions, setRegions] = useState<string[]>([]);
  const [breedQuery, setBreedQuery] = useState("");
  const [colorQuery, setColorQuery] = useState("");
  const [regionQuery, setRegionQuery] = useState("");

  const toggle = (setter: Dispatch<SetStateAction<string[]>>) => (value: string) => {
    setter(current => current.includes(value) ? current.filter(item => item !== value) : [...current, value]);
  };
  const match = (value: string, query: string) => !query.trim() || value.toLocaleLowerCase("ko-KR").includes(query.trim().toLocaleLowerCase("ko-KR"));

  const openPanel = () => {
    setSpecies(filters.species === "cat" ? ["고양이"] : filters.species === "dog" ? ["개"] : []);
    setBreeds(filters.breedKeys);
    setSex(filters.sex === "female" ? ["암컷"] : filters.sex === "male" ? ["수컷"] : []);
    setColors(filters.color === "all" ? [] : [filters.color]);
    setAges([]); setWeights([]); setStates([]); setRegions([]);
    setBreedQuery(""); setColorQuery(""); setRegionQuery(""); setError(""); setOpen(true);
  };

  useEffect(() => {
    if (!open || options) return;
    setLoading(true);
    fetch("/api/animal-filter-options")
      .then(async response => { const body = await response.json(); if (!response.ok) throw new Error(body.error || "공공 API 필터를 불러오지 못했어요."); setOptions(body); })
      .catch(value => setError(value instanceof Error ? value.message : "공공 API 필터를 불러오지 못했어요."))
      .finally(() => setLoading(false));
  }, [open, options]);

  const apply = () => {
    const selectedSpecies = species.length === 1 && /고양이/.test(species[0]) ? "cat" : species.length === 1 && /개|강아지/.test(species[0]) ? "dog" : "all";
    const selectedSex = sex.length === 1 && sex[0] === "암컷" ? "female" : sex.length === 1 && sex[0] === "수컷" ? "male" : "all";
    setFilter("species", selectedSpecies); setFilter("sex", selectedSex); setFilter("color", colors.length === 1 ? colors[0] : "all"); setFilter("breedKeys", breeds.slice(0, 10)); setOpen(false);
  };
  const clearDraft = () => { setSpecies([]); setBreeds([]); setSex([]); setColors([]); setAges([]); setWeights([]); setStates([]); setRegions([]); setBreedQuery(""); setColorQuery(""); setRegionQuery(""); resetFilters(); };

  return (
    <>
      <Chip.Button className="ff-all-filter-trigger" variant="outlineWeak" size="medium" onClick={openPanel} aria-label={activeCount > 0 ? `전체 필터 열기, ${activeCount}개 선택됨` : "전체 필터 열기"} data-checked={activeCount > 0 || undefined}>
        <Chip.PrefixIcon><Icon svg={<IconSlider2HorizontalLine />} /></Chip.PrefixIcon>
        {activeCount > 0 && <span className="ff-all-filter-count">{activeCount}</span>}
      </Chip.Button>

      {open && <div className="ff-all-filter-overlay" role="dialog" aria-modal="true" aria-label="공공 API 전체 필터">
        <header className="ff-all-filter-header"><div><span className="ff-kicker">공공 API 원문 기준</span><h1>어떤 친구를 찾고 있나요?</h1><p>자주 쓰는 조건부터 골라볼 수 있어요.</p></div><button type="button" onClick={() => setOpen(false)} aria-label="필터 닫기"><IconXmarkLine aria-hidden /></button></header>
        <div className="ff-all-filter-content">
          {loading && <div className="ff-all-filter-loading"><LoadingIndicator label="공공 API 필터를 불러오는 중" /></div>}
          {error && <p className="ff-all-filter-error">{error}</p>}
          {options && <Accordion className="ff-all-filter-accordion" multiple defaultValue={["species"]}>
            <FilterGroup value="species" title="종류" values={options.species} selected={species} onToggle={toggle(setSpecies)} />
            <AccordionItem value="breeds" className="ff-all-filter-group"><AccordionTrigger title="품종" description={breeds.length ? `${breeds.length}개 선택됨` : `${options.breeds.length.toLocaleString("ko-KR")}개`} /><AccordionContent><TextField className="ff-all-filter-search"><TextFieldInput value={breedQuery} onChange={event => setBreedQuery(event.target.value)} placeholder="품종 검색" /></TextField><div className="ff-all-filter-options ff-all-filter-long-list">{options.breeds.filter(item => match(item.label, breedQuery)).map(item => <Checkbox key={item.key} checked={breeds.includes(item.key)} onCheckedChange={() => toggle(setBreeds)(item.key)} label={<span>{item.label}<small>{item.species}</small></span>} />)}{!options.breeds.some(item => match(item.label, breedQuery)) && <p className="ff-all-filter-empty">일치하는 품종이 없어요.</p>}</div></AccordionContent></AccordionItem>
            <FilterGroup value="sex" title="성별" values={options.sex} selected={sex} onToggle={toggle(setSex)} />
            <FilterGroup value="colors" title="털색 원문" values={options.colors.filter(value => match(value, colorQuery))} selected={colors} onToggle={toggle(setColors)} query={colorQuery} onQueryChange={setColorQuery} />
            <FilterGroup value="ages" title="나이 원문" values={options.ages} selected={ages} onToggle={toggle(setAges)} />
            <FilterGroup value="weights" title="체중 원문" values={options.weights} selected={weights} onToggle={toggle(setWeights)} />
            <FilterGroup value="states" title="보호 상태 원문" values={options.states} selected={states} onToggle={toggle(setStates)} />
            <FilterGroup value="regions" title="발견 지역 원문" values={options.regions.filter(value => match(value, regionQuery))} selected={regions} onToggle={toggle(setRegions)} query={regionQuery} onQueryChange={setRegionQuery} />
          </Accordion>}
        </div>
        <footer className="ff-all-filter-footer"><button type="button" onClick={clearDraft}>전체 초기화</button><ActionButton onClick={apply}>선택 조건 적용</ActionButton></footer>
      </div>}
    </>
  );
}
