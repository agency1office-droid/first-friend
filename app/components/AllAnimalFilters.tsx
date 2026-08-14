/* eslint-disable react-hooks/set-state-in-effect -- opening the panel starts its lazy options request */
"use client";

import { useEffect, useMemo, useState } from "react";
import { PUBLIC_ANIMAL_AGE_MAX } from "../../lib/animal-filter-ranges";
import { IconCalendarLine, IconCheckmarkScaleLine, IconChevronLeftLine, IconChevronDownLine, IconPawprintLine, IconPersonLine, IconSlider2HorizontalLine, IconTagLine, IconXmarkLine } from "@karrotmarket/react-monochrome-icon";
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
const orderedSex = (values: string[]) => ["수컷", "암컷", "미상", ...values.filter(value => !["수컷", "암컷", "미상"].includes(value))].filter((value, index, items) => items.indexOf(value) === index);
const normalizeBreedSearch = (value: string) => value.toLocaleLowerCase("ko-KR").replace(/[\s._-]+/g, "");
const breedAliasGroups = [
  ["진돗개", "진도개", "진도견"],
  ["말티즈", "몰티즈"],
  ["시츄", "시추"],
  ["요크셔테리어", "요크셔 테리어"],
  ["웰시코기", "웰시 코기"],
  ["닥스훈트", "닥스훈드"],
  ["러시안블루", "러시안 블루"],
  ["스코티시폴드", "스코티시 폴드"],
  ["아메리칸숏헤어", "아메리칸 숏헤어"],
  ["브리티시숏헤어", "브리티시 숏헤어"],
] as const;
const breedSearchTerms = (label: string) => {
  const normalized = normalizeBreedSearch(label);
  const group = breedAliasGroups.find(aliases => aliases.some(alias => normalizeBreedSearch(alias) === normalized));
  return group ? [...group, label] : [label];
};

function SectionHeading({ title, action, count, icon }: { title: string; action?: React.ReactNode; count?: string; icon?: React.ReactNode }) {
  return <div className="ff-filter-section-heading">{icon && <span className="ff-filter-section-icon" aria-hidden>{icon}</span>}<h2>{title}</h2>{count && <span className="ff-filter-section-count">{count}</span>}{action}</div>;
}

const ageOptions = [
  ["young", "아기", "1살 이하"],
  ["adult", "성장기", "2~5살"],
  ["mature", "어른", "6~10살"],
  ["senior", "노령", "11살 이상"],
] as const;
const sizeOptions = () => [["small", "소형"], ["medium", "중형"], ["large", "대형"], ["xlarge", "초대형"]] as const;
const coatColors = ["흰색", "검정", "갈색", "황색", "회색", "삼색", "고등어", "치즈"] as const;
const dogCoatColors = ["흰색", "검정", "갈색", "황색", "회색", "기타·복합색"] as const;
const catCoatColors = ["흰색", "검정", "갈색", "황색", "회색", "삼색", "고등어", "치즈", "기타·복합색"] as const;
const colorsForSpecies = (species: AnimalFeedFilters["species"]) => species === "dog" ? dogCoatColors : species === "cat" ? catCoatColors : coatColors;

export function AllAnimalFilters({ activeCount, filters, setFilter, resetFilters }: Props) {
  const [open, setOpen] = useState(false), [loading, setLoading] = useState(false), [countLoading, setCountLoading] = useState(false), [draftCount, setDraftCount] = useState<number | null>(null), [error, setError] = useState(""), [options, setOptions] = useState<Options | null>(null);
  const [species, setSpecies] = useState<AnimalFeedFilters["species"]>(filters.species), [breeds, setBreeds] = useState<string[]>(filters.breedKeys), [sex, setSex] = useState<string[]>([]), [neutered, setNeutered] = useState<string[]>([]), [color, setColor] = useState(filters.color);
  const [ageGroup, setAgeGroup] = useState(filters.ageGroup), [sizeGroup, setSizeGroup] = useState(filters.sizeGroup), [breedQuery, setBreedQuery] = useState(""), [showBreeds, setShowBreeds] = useState(false);
  const toggle = (setter: React.Dispatch<React.SetStateAction<string[]>>) => (value: string) => setter(current => current.includes(value) ? current.filter(item => item !== value) : [...current, value]);
  const openPanel = () => {
    // 필터 창을 여는 순간 검색 함수를 미리 깨워 첫 조건 선택 때의
    // Vercel cold start를 사용자 대기시간에 포함시키지 않습니다.
    void fetch("/api/animals?limit=1&sort=recent", { cache: "force-cache", keepalive: true }).catch(() => undefined);
    setSpecies(filters.species); setBreeds(filters.breedKeys); setSex(filters.sex === "all" ? [] : filters.sex.split(",").filter(Boolean).map(value => value === "female" ? "암컷" : value === "unknown" ? "미상" : "수컷")); setNeutered(filters.neutered === "all" ? [] : filters.neutered.split(",").map(value => value === "yes" ? "중성화 완료" : "중성화 안 됨"));
    setAgeGroup(filters.ageGroup); setSizeGroup(filters.species === "all" ? "all" : filters.sizeGroup); setColor(filters.color); setBreedQuery(""); setShowBreeds(Boolean(filters.species !== "all")); setError(""); setOpen(true);
  };
  useEffect(() => {
    if (!open || options) return;
    setLoading(true); fetch("/api/animal-filter-options").then(async response => { const body = await response.json(); if (!response.ok) throw new Error(body.error || "필터를 불러오지 못했어요."); setOptions(body); }).catch(value => setError(value instanceof Error ? value.message : "필터를 불러오지 못했어요.")).finally(() => setLoading(false));
  }, [open, options]);
  useEffect(() => {
    if (!open) return;
    const previousHtmlOverflow = document.documentElement.style.overflow;
    const previousBodyOverflow = document.body.style.overflow;
    const previousHtmlOverscroll = document.documentElement.style.overscrollBehavior;
    const previousBodyOverscroll = document.body.style.overscrollBehavior;
    document.documentElement.style.overflow = "hidden";
    document.body.style.overflow = "hidden";
    document.documentElement.style.overscrollBehavior = "none";
    document.body.style.overscrollBehavior = "none";
    return () => {
      document.documentElement.style.overflow = previousHtmlOverflow;
      document.body.style.overflow = previousBodyOverflow;
      document.documentElement.style.overscrollBehavior = previousHtmlOverscroll;
      document.body.style.overscrollBehavior = previousBodyOverscroll;
    };
  }, [open]);
  useEffect(() => {
    if (!open) return;
    const controller = new AbortController();
    let current = true;
    const params = new URLSearchParams({ species, breeds: breeds.join(","), sex: sex.map(value => value === "암컷" ? "female" : value === "미상" ? "unknown" : "male").join(","), neutered: neutered.map(value => value === "중성화 완료" ? "yes" : "no").join(","), age: ageGroup === "all" ? "" : ageGroup, size: sizeGroup === "all" ? "" : sizeGroup, color: color === "all" ? "" : color, limit: "1", sort: "recent" });
    const timer = window.setTimeout(async () => {
      setCountLoading(true);
      try {
        const response = await fetch(`/api/animals?${params}`, { signal: controller.signal });
        const body = await response.json();
        if (!response.ok) throw new Error(body.error || "개체 수를 계산하지 못했어요.");
        if (current) setDraftCount(Number(body.total) || 0);
      } catch (error) {
        if (current && !(error instanceof DOMException && error.name === "AbortError")) setDraftCount(null);
      } finally {
        if (current) setCountLoading(false);
      }
    }, 100);
    return () => { current = false; controller.abort(); window.clearTimeout(timer); };
  }, [ageGroup, breeds, color, neutered, open, sex, sizeGroup, species]);
  const visibleBreeds = useMemo(() => {
    const query = normalizeBreedSearch(breedQuery.trim());
    return options?.breeds.filter(item => (species === "all" || normalizedSpecies(item.species) === species) && (!query || breedSearchTerms(item.label).some(term => normalizeBreedSearch(term).includes(query)))) || [];
  }, [breedQuery, options, species]);
  const apply = () => {
    setFilter("species", species); setFilter("breedKeys", breeds.slice(0, 10)); setFilter("sex", sex.map(value => value === "암컷" ? "female" : value === "미상" ? "unknown" : "male").join(",") || "all"); setFilter("neutered", neutered.map(value => value === "중성화 완료" ? "yes" : "no").join(",") || "all"); setFilter("ageGroup", ageGroup); setFilter("sizeGroup", species === "all" ? "all" : sizeGroup); setFilter("color", color); setFilter("ageMin", 0); setFilter("ageMax", PUBLIC_ANIMAL_AGE_MAX); setOpen(false);
  };
  const clearDraft = () => { setSpecies("all"); setBreeds([]); setSex([]); setNeutered([]); setAgeGroup("all"); setSizeGroup("all"); setColor("all"); resetFilters(); };
  const applied = [
    ...(species !== "all" ? [{ key: "species", label: species === "cat" ? "고양이" : "강아지" }] : []),
    ...breeds.map(key => ({ key: `breed:${key}`, label: options?.breeds.find(item => item.key === key)?.label || "선택한 품종" })),
    ...(sex.map(value => ({ key: `sex:${value}`, label: value }))), ...(neutered.map(value => ({ key: `neutered:${value}`, label: value }))),
    ...(ageGroup !== "all" ? ageGroup.split(",").map(value => ({ key: `age:${value}`, label: ageOptions.find(([option]) => option === value)?.[1] || "나이" })) : []),
    ...(sizeGroup !== "all" ? sizeGroup.split(",").map(value => ({ key: `size:${value}`, label: sizeOptions().find(([option]) => option === value)?.[1] || "크기" })) : []),
    ...(color !== "all" ? [{ key: "color", label: color }] : []),
  ];
  const removeApplied = (key: string) => { if (key === "species") { setSpecies("all"); setBreeds([]); } else if (key === "color") setColor("all"); else if (key.startsWith("breed:")) setBreeds(current => current.filter(item => `breed:${item}` !== key)); else if (key.startsWith("sex:")) setSex(current => current.filter(value => `sex:${value}` !== key)); else if (key.startsWith("neutered:")) setNeutered(current => current.filter(value => `neutered:${value}` !== key)); else if (key.startsWith("age:")) setAgeGroup(current => current.split(",").filter(value => `age:${value}` !== key).join(",") || "all"); else if (key.startsWith("size:")) setSizeGroup(current => current.split(",").filter(value => `size:${value}` !== key).join(",") || "all"); };

  return <>
    <Chip.Button className="ff-all-filter-trigger" variant="outlineWeak" size="medium" onClick={openPanel} aria-label="전체 필터 열기" data-checked={activeCount > 0 || undefined}><Chip.PrefixIcon><Icon svg={<IconSlider2HorizontalLine />} /></Chip.PrefixIcon>{activeCount > 0 && <span className="ff-all-filter-count">{activeCount}</span>}</Chip.Button>
    {open && <div className="ff-all-filter-overlay" role="dialog" aria-modal="true" aria-label="전체 필터" onWheelCapture={event => event.stopPropagation()} onTouchMoveCapture={event => event.stopPropagation()}>
      <header className="ff-filter-reference-header"><button type="button" onClick={() => setOpen(false)} aria-label="필터 닫기"><IconChevronLeftLine aria-hidden /></button><h1>친구 찾기</h1><button type="button" onClick={clearDraft}>전체 초기화</button></header>
      <div className="ff-all-filter-content ff-filter-reference-content">
        {loading && <div className="ff-all-filter-loading"><LoadingIndicator label="필터를 불러오는 중" /></div>}{error && <p className="ff-all-filter-error">{error}</p>}{options && <>
          <section className="ff-filter-reference-section"><SectionHeading title="종류 · 품종" icon={<IconPawprintLine />} /><div className="ff-filter-species-grid">{(["dog", "cat"] as const).map(value => <button type="button" key={value} className="ff-filter-species-card" data-selected={species === value || undefined} onClick={() => { if (species === value) { setSpecies("all"); setBreeds([]); setColor("all"); setSizeGroup("all"); setShowBreeds(false); return; } setSpecies(value); setColor(current => colorsForSpecies(value).includes(current as never) ? current : "all"); setShowBreeds(true); setBreeds(current => current.filter(key => { const breed = options.breeds.find(item => item.key === key); return !breed || normalizedSpecies(breed.species) === value; })); }}><span className="ff-filter-species-illustration" aria-hidden>{value === "dog" ? "🐶" : "🐱"}</span><strong>{value === "dog" ? "강아지" : "고양이"}</strong><small>{options.breeds.filter(item => normalizedSpecies(item.species) === value).reduce((sum, item) => sum + item.count, 0).toLocaleString("ko-KR")}마리</small></button>)}</div>{species !== "all" && <div className="ff-filter-breed-toolbar"><span><IconTagLine aria-hidden /><strong>품종</strong></span><button type="button" data-expanded={showBreeds || undefined} aria-expanded={showBreeds} onClick={() => setShowBreeds(current => !current)} aria-label={showBreeds ? "품종 접기" : "품종 펼치기"}><Icon svg={<IconChevronDownLine />} /></button></div>}{showBreeds && <><TextField className="ff-filter-search"><TextFieldInput value={breedQuery} onChange={event => setBreedQuery(event.target.value)} placeholder="품종을 검색해보세요" /></TextField><div className="ff-filter-breed-list" role="list" aria-label="품종 목록"><Checkbox checked={!breeds.length} onCheckedChange={() => setBreeds([])} label={<span className="ff-breed-filter-label"><strong>모든 품종</strong></span>} />{visibleBreeds.slice(0, 100).map(item => <Checkbox key={item.key} checked={breeds.includes(item.key)} onCheckedChange={() => toggle(setBreeds)(item.key)} label={<span className="ff-breed-filter-label"><strong>{humanize(item.label)}</strong><small>{item.count.toLocaleString("ko-KR")}마리</small></span>} />)}</div></>}</section>
          {species !== "all" && <section className="ff-filter-reference-section"><SectionHeading title="털색" /><div className="ff-color-palette" role="listbox" aria-label="털색"><button className="ff-color-option" type="button" data-color="all" role="option" aria-selected={color === "all"} onClick={() => setColor("all")}><span className="ff-color-swatch" aria-hidden /><strong>모두</strong>{color === "all" && <b aria-hidden>✓</b>}</button>{colorsForSpecies(species).map(value => <button className="ff-color-option" type="button" key={value} data-color={value} role="option" aria-selected={color === value} onClick={() => setColor(value)}><span className="ff-color-swatch" aria-hidden /><strong>{value}</strong>{color === value && <b aria-hidden>✓</b>}</button>)}</div></section>}
          <section className="ff-filter-reference-section"><SectionHeading title="나이" icon={<IconCalendarLine />} /><div className="ff-filter-choice-grid"><button type="button" className="ff-filter-choice ff-filter-age-choice" data-selected={ageGroup === "all" || undefined} onClick={() => setAgeGroup("all")}><strong>모두</strong><small>모든 나이</small></button>{ageOptions.map(([value, title, range]) => <button type="button" key={value} className="ff-filter-choice ff-filter-age-choice" data-selected={ageGroup === value || undefined} onClick={() => setAgeGroup(current => current === value ? "all" : value)}><strong>{title}</strong><small>{range}</small></button>)}</div></section>
          {species !== "all" && <section className="ff-filter-reference-section"><SectionHeading title="크기" /><div className="ff-filter-choice-grid"><button type="button" className="ff-filter-choice ff-filter-size-choice" data-selected={sizeGroup === "all" || undefined} onClick={() => setSizeGroup("all")}><strong>모두</strong></button>{sizeOptions().map(([value, label]) => <button type="button" key={value} className={`ff-filter-choice ff-filter-size-choice is-${value}`} data-selected={sizeGroup.split(",").includes(value) || undefined} onClick={() => setSizeGroup(current => { const values = current === "all" ? [] : current.split(","); const next = values.includes(value) ? values.filter(item => item !== value) : [...values, value]; return next.join(",") || "all"; })}><strong>{label}</strong></button>)}</div></section>}
          <section className="ff-filter-reference-section"><SectionHeading title="성별" icon={<IconPersonLine />} /><div className="ff-filter-choice-grid"><button type="button" className="ff-filter-choice ff-filter-sex-choice" data-selected={!sex.length || undefined} onClick={() => setSex([])}><strong>모두</strong></button>{orderedSex(options.sex).map(value => <button type="button" key={value} className="ff-filter-choice ff-filter-sex-choice" data-selected={sex.includes(value) || undefined} onClick={() => setSex(current => current.includes(value) ? [] : [value])}><strong>{humanize(value)}</strong></button>)}</div></section>
          <section className="ff-filter-reference-section"><SectionHeading title="중성화 여부" icon={<IconCheckmarkScaleLine />} /><div className="ff-filter-choice-grid"><button type="button" className="ff-filter-choice ff-filter-neuter-choice" data-selected={!neutered.length || undefined} onClick={() => setNeutered([])}><strong>모두</strong></button>{[["yes", "중성화 완료"], ["no", "중성화 안 됨"]].map(([value, label]) => <button type="button" key={value} className="ff-filter-choice ff-filter-neuter-choice" data-selected={neutered.includes(label) || undefined} onClick={() => setNeutered(current => current.includes(label) ? [] : [label])}><strong>{label}</strong></button>)}</div></section>
        </>}
      </div><footer className="ff-filter-reference-footer">{applied.length > 0 && <div className="ff-filter-applied ff-filter-applied-footer" aria-label="선택한 조건">{applied.map(item => <button type="button" key={item.key} onClick={() => removeApplied(item.key)}>{item.label}<IconXmarkLine aria-hidden /></button>)}</div>}<ActionButton onClick={apply}>선택 조건 적용{countLoading ? " · 계산 중" : draftCount === null ? "" : ` · ${draftCount.toLocaleString("ko-KR")}마리`}</ActionButton></footer>
    </div>}
  </>;
}
