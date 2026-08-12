"use client";

import { useEffect, useMemo, useState } from "react";
import { IconChevronDownLine, IconXmarkLine } from "@karrotmarket/react-monochrome-icon";
import { Icon } from "@seed-design/react";
import { ActionButton } from "seed-design/ui/action-button";
import { BottomSheetBody, BottomSheetContent, BottomSheetFooter, BottomSheetRoot, BottomSheetTrigger } from "seed-design/ui/bottom-sheet";
import { Chip } from "seed-design/ui/chip";
import { Checkbox } from "seed-design/ui/checkbox";
import { LoadingIndicator } from "./LoadingIndicator";
import { SegmentedControl, SegmentedControlItem } from "seed-design/ui/segmented-control";
import { TextField, TextFieldInput } from "seed-design/ui/text-field";
import type { AnimalFeedFilters } from "./useAnimalFeed";
import { AllAnimalFilters } from "./AllAnimalFilters";

type BreedOption = { key: string; kindNm: string; species: "dog" | "cat"; count: number };

const statusOptions = [
  ["all", "모든 보호 동물", "현재 보호 중인 친구를 모두 볼 수 있어요."],
  ["checking", "입양 상담 가능", "보호자 확인이 끝나 상담을 시작할 수 있어요."],
  ["notice", "보호자 확인 공고 중", "보호자를 찾는 절차가 진행 중인 친구예요."],
] as const;

const sortOptions = [
  ["distance", "가까운 보호소 순", "내 동네에서 가까운 보호소부터 볼 수 있어요."],
  ["recent", "최근 등록순", "새로 등록된 친구부터 볼 수 있어요."],
] as const;

function SortFilterSheet({ value, active, hasLocation, onChange, onReset }: {
  value: AnimalFeedFilters["sort"]; active: boolean; hasLocation: boolean;
  onChange: (value: AnimalFeedFilters["sort"]) => void; onReset: () => void;
}) {
  const [open, setOpen] = useState(false);
  return <BottomSheetRoot open={open} onOpenChange={setOpen}>
    <BottomSheetTrigger asChild>
      <Chip.Button className="ff-animal-filter-chip" variant="outlineWeak" size="medium" data-checked={active || undefined}>
        <Chip.Label>{value === "recent" || !hasLocation ? "최근 등록순" : "가까운 순"}</Chip.Label>
        <Chip.SuffixIcon><Icon svg={<IconChevronDownLine/>}/></Chip.SuffixIcon>
      </Chip.Button>
    </BottomSheetTrigger>
    <BottomSheetContent title="정렬 기준" description="가까운 보호소 또는 최근 등록된 순서로 볼 수 있어요.">
      <BottomSheetBody className="ff-status-filter-body">
        <div className="ff-status-options" role="listbox" aria-label="정렬 기준 선택">
          {sortOptions.map(([optionValue, optionLabel, optionDescription]) => <button className="ff-status-option" type="button" key={optionValue} role="option" aria-selected={value === optionValue} disabled={optionValue === "distance" && !hasLocation} onClick={() => { onChange(optionValue); setOpen(false); }}>
            <span><strong>{optionLabel}</strong><small>{optionDescription}</small></span>
            {value === optionValue && <b aria-hidden>✓</b>}
          </button>)}
        </div>
      </BottomSheetBody>
      {active && value === "recent" && <BottomSheetFooter><ActionButton variant="neutralWeak" onClick={() => { onReset(); setOpen(false); }}>선택 해제</ActionButton></BottomSheetFooter>}
    </BottomSheetContent>
  </BottomSheetRoot>;
}

function StatusFilterSheet({ value, active, onChange, onReset }: {
  value: AnimalFeedFilters["publicStatus"]; active: boolean;
  onChange: (value: AnimalFeedFilters["publicStatus"]) => void; onReset: () => void;
}) {
  const [open, setOpen] = useState(false);
  return <BottomSheetRoot open={open} onOpenChange={setOpen}>
    <BottomSheetTrigger asChild>
      <Chip.Button className="ff-animal-filter-chip" variant="outlineWeak" size="medium" data-checked={active || undefined}>
        <Chip.Label>보호 단계</Chip.Label>
        <Chip.SuffixIcon><Icon svg={<IconChevronDownLine/>}/></Chip.SuffixIcon>
      </Chip.Button>
    </BottomSheetTrigger>
    <BottomSheetContent title="보호 단계로 찾기" description="현재 보호 절차에 따라 친구를 골라볼 수 있어요.">
      <BottomSheetBody className="ff-status-filter-body">
        <div className="ff-status-options" role="listbox" aria-label="보호 단계 선택">
          {statusOptions.map(([optionValue, optionLabel, optionDescription]) => <button className="ff-status-option" type="button" key={optionValue} role="option" aria-selected={value === optionValue} onClick={() => { onChange(optionValue); setOpen(false); }}>
            <span><strong>{optionLabel}</strong><small>{optionDescription}</small></span>
            {value === optionValue && <b aria-hidden>✓</b>}
          </button>)}
        </div>
      </BottomSheetBody>
      {active && <BottomSheetFooter><ActionButton variant="neutralWeak" onClick={() => { onReset(); setOpen(false); }}>선택 해제</ActionButton></BottomSheetFooter>}
    </BottomSheetContent>
  </BottomSheetRoot>;
}

function BreedFilterSheet({ filters, location, onApply }: {
  filters: AnimalFeedFilters; location: { lat: number; lng: number } | null;
  onApply: (species: AnimalFeedFilters["species"], breedKeys: string[]) => void;
}) {
  const [open, setOpen] = useState(false);
  const [draftSpecies, setDraftSpecies] = useState<AnimalFeedFilters["species"]>(filters.species);
  const [draft, setDraft] = useState(filters.breedKeys);
  const [query, setQuery] = useState("");
  const [items, setItems] = useState<BreedOption[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const changeOpen = (next: boolean) => {
    if (next) { setDraftSpecies(filters.species); setDraft(filters.breedKeys); setQuery(""); setLoading(true); setError(""); }
    setOpen(next);
  };
  useEffect(() => {
    if (!open) return;
    const controller = new AbortController();
    const params = new URLSearchParams({ species: "all" });
    if (location) { params.set("lat", String(location.lat)); params.set("lng", String(location.lng)); }
    if (filters.publicStatus !== "all") params.set("status", filters.publicStatus);
    if (filters.sex !== "all") params.set("sex", filters.sex);
    fetch(`/api/breeds?${params}`, { signal: controller.signal }).then(async response => {
      const body = await response.json();
      if (!response.ok) throw new Error(body.error || "품종 목록을 불러오지 못했어요.");
      setItems(body.items || []);
    }).catch(value => { if (!controller.signal.aborted) setError(value instanceof Error ? value.message : "품종 목록을 불러오지 못했어요."); }).finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, [filters.publicStatus, filters.sex, location, open]);
  const shown = useMemo(() => {
    const word = query.trim().toLocaleLowerCase("ko-KR");
    return items.filter(item => (draftSpecies === "all" || item.species === draftSpecies) && (!word || item.kindNm.toLocaleLowerCase("ko-KR").includes(word)));
  }, [draftSpecies, items, query]);
  const speciesCounts = useMemo(() => ({ cat: items.filter(item => item.species === "cat").length, dog: items.filter(item => item.species === "dog").length }), [items]);
  const shownAnimalCount = useMemo(() => shown.reduce((sum, item) => sum + item.count, 0), [shown]);
  const toggle = (key: string, checked: boolean) => setDraft(current => checked ? current.includes(key) ? current : [...current, key].slice(0, 10) : current.filter(value => value !== key));
  const changeSpecies = (value: AnimalFeedFilters["species"]) => {
    setDraftSpecies(value);
    setDraft(current => value === "all" ? current : current.filter(key => key.startsWith(value === "cat" ? "422400:" : "417000:")));
    setQuery("");
  };
  const active = filters.species !== "all" || filters.breedKeys.length > 0;
  const label = filters.breedKeys.length ? `품종 ${filters.breedKeys.length}` : filters.species === "cat" ? "고양이" : filters.species === "dog" ? "강아지" : "품종";
  return <BottomSheetRoot open={open} onOpenChange={changeOpen}>
    <BottomSheetTrigger asChild>
      <Chip.Button className="ff-animal-filter-chip" variant="outlineWeak" size="medium" data-checked={active || undefined}>
        <Chip.Label>{label}</Chip.Label>
        <Chip.SuffixIcon><Icon svg={<IconChevronDownLine/>}/></Chip.SuffixIcon>
      </Chip.Button>
    </BottomSheetTrigger>
    <BottomSheetContent title="품종으로 찾기" description="고양이·강아지를 고른 뒤 공공데이터의 세부 품종을 최대 10개까지 선택할 수 있어요.">
      <BottomSheetBody className="ff-breed-filter-body">
        <SegmentedControl className="ff-breed-species-control" aria-label="품종 동물 분류" value={draftSpecies} onValueChange={value => changeSpecies(value as AnimalFeedFilters["species"])}>
          <SegmentedControlItem value="all"><span className="ff-breed-species-label"><span>모두</span><small>{items.length}종</small></span></SegmentedControlItem>
          <SegmentedControlItem value="cat"><span className="ff-breed-species-label"><span>고양이</span><small>{speciesCounts.cat}종</small></span></SegmentedControlItem>
          <SegmentedControlItem value="dog"><span className="ff-breed-species-label"><span>강아지</span><small>{speciesCounts.dog}종</small></span></SegmentedControlItem>
        </SegmentedControl>
        <TextField label="품종 검색" value={query} onValueChange={({ slicedValue }) => setQuery(slicedValue)} maxGraphemeCount={30} hideCharacterCount><TextFieldInput placeholder="예: 믹스견, 한국 고양이, 푸들"/></TextField>
        <p className="ff-breed-filter-summary">{draft.length ? `${draft.length}개 선택됨 · 현재 ${shown.length}개 품종` : `현재 ${shown.length}개 공공데이터 품종`}</p>
        <div className="ff-breed-filter-list" aria-label="공식 품종 목록">
          {loading&&<p className="ff-breed-filter-state"><LoadingIndicator label="품종 목록을 불러오는 중" /></p>}
          {error&&<p className="ff-breed-filter-state is-error">{error}</p>}
          {!loading&&!error&&!query.trim()&&<Checkbox checked={!draft.length} onCheckedChange={() => setDraft([])} label={<span className="ff-breed-filter-label"><strong>{draftSpecies === "cat" ? "모든 고양이" : draftSpecies === "dog" ? "모든 강아지" : "모든 품종"}</strong><small>{shownAnimalCount.toLocaleString("ko-KR")}마리</small></span>}/>} 
          {!loading&&!error&&shown.map(item => <Checkbox key={item.key} checked={draft.includes(item.key)} disabled={!draft.includes(item.key) && (draft.length >= 10 || item.count === 0)} onCheckedChange={checked => toggle(item.key, checked === true)} label={<span className="ff-breed-filter-label"><strong>{item.kindNm}</strong><small>{draftSpecies === "all" ? `${item.species === "dog" ? "강아지" : "고양이"} · ` : ""}{item.count.toLocaleString("ko-KR")}마리</small></span>}/>)}
          {!loading&&!error&&!shown.length&&<p className="ff-breed-filter-state">일치하는 공식 품종이 없어요.</p>}
        </div>
      </BottomSheetBody>
      <BottomSheetFooter>
        <ActionButton variant="neutralWeak" disabled={draftSpecies === "all" && !draft.length} onClick={() => { setDraftSpecies("all"); setDraft([]); }}>초기화</ActionButton>
        <ActionButton onClick={() => { onApply(draftSpecies, draft); setOpen(false); }}>{draft.length ? `${draft.length}개 품종 보기` : draftSpecies === "all" ? "모든 친구 보기" : `${draftSpecies === "cat" ? "고양이" : "강아지"} 보기`}</ActionButton>
      </BottomSheetFooter>
    </BottomSheetContent>
  </BottomSheetRoot>;
}

const colorOptions = [
  ["all", "모든 털색"], ["흰색", "흰색"], ["검정", "검정"], ["갈색", "갈색"], ["황색", "황색"],
  ["회색", "회색"], ["삼색", "삼색"], ["고등어", "고등어"], ["치즈", "치즈"],
] as const;

function ColorFilterSheet({ value, active, onChange, onReset }: {
  value: string; active: boolean; onChange: (value: string) => void; onReset: () => void;
}) {
  const [open, setOpen] = useState(false);
  return <BottomSheetRoot open={open} onOpenChange={setOpen}>
    <BottomSheetTrigger asChild>
      <Chip.Button className="ff-animal-filter-chip" variant="outlineWeak" size="medium" data-checked={active || undefined}>
        <Chip.Label>{value === "all" ? "털색" : value}</Chip.Label>
        <Chip.SuffixIcon><Icon svg={<IconChevronDownLine/>}/></Chip.SuffixIcon>
      </Chip.Button>
    </BottomSheetTrigger>
    <BottomSheetContent title="털색으로 찾기" description="비슷한 표현의 털색을 묶어서 찾아볼 수 있어요.">
      <BottomSheetBody className="ff-color-filter-body">
        <div className="ff-color-palette" role="listbox" aria-label="털색 선택">
          {colorOptions.map(([optionValue, optionLabel]) => <button className="ff-color-option" type="button" key={optionValue} role="option" aria-selected={value === optionValue} data-color={optionValue} onClick={() => { onChange(optionValue); setOpen(false); }}>
            <span className="ff-color-swatch" aria-hidden />
            <span>{optionLabel}</span>
            {value === optionValue && <b aria-hidden>✓</b>}
          </button>)}
        </div>
      </BottomSheetBody>
      {active && <BottomSheetFooter><ActionButton variant="neutralWeak" onClick={() => { onReset(); setOpen(false); }}>선택 해제</ActionButton></BottomSheetFooter>}
    </BottomSheetContent>
  </BottomSheetRoot>;
}

const genderOptions = [["all", "전체", "●"], ["male", "수컷", "♂"], ["female", "암컷", "♀"]] as const;

function GenderFilterSheet({ value, active, onChange, onReset }: {
  value: AnimalFeedFilters["sex"]; active: boolean; onChange: (value: AnimalFeedFilters["sex"]) => void; onReset: () => void;
}) {
  const [open, setOpen] = useState(false);
  return <BottomSheetRoot open={open} onOpenChange={setOpen}>
    <BottomSheetTrigger asChild>
      <Chip.Button className="ff-animal-filter-chip" variant="outlineWeak" size="medium" data-checked={active || undefined}>
        <Chip.Label>{value === "all" ? "성별" : value === "male" ? "수컷" : "암컷"}</Chip.Label>
        <Chip.SuffixIcon><Icon svg={<IconChevronDownLine/>}/></Chip.SuffixIcon>
      </Chip.Button>
    </BottomSheetTrigger>
    <BottomSheetContent title="성별로 찾기" description="공공데이터에 등록된 성별을 기준으로 찾아볼 수 있어요.">
      <BottomSheetBody className="ff-gender-filter-body">
        <div className="ff-gender-palette" role="listbox" aria-label="성별 선택">
          {genderOptions.map(([optionValue, optionLabel, symbol]) => <button className="ff-gender-option" type="button" key={optionValue} role="option" aria-selected={value === optionValue} data-gender={optionValue} onClick={() => { onChange(optionValue); setOpen(false); }}>
            <span className="ff-gender-symbol" aria-hidden>{symbol}</span>
            <span>{optionLabel}</span>
            {value === optionValue && <b aria-hidden>✓</b>}
          </button>)}
        </div>
      </BottomSheetBody>
      {active && <BottomSheetFooter><ActionButton variant="neutralWeak" onClick={() => { onReset(); setOpen(false); }}>선택 해제</ActionButton></BottomSheetFooter>}
    </BottomSheetContent>
  </BottomSheetRoot>;
}

export function AnimalFilterBar({ filters, location, hasLocation, activeCount, setFilter, resetFilters }: {
  filters: AnimalFeedFilters; location: { lat: number; lng: number } | null; hasLocation: boolean; activeCount: number;
  setFilter: <K extends keyof AnimalFeedFilters>(key: K, value: AnimalFeedFilters[K]) => void; resetFilters: () => void;
}) {
  return <div className="ff-animal-filter-wrap" aria-label="보호동물 목록 필터">
    <div className="ff-animal-filter-scroll">
      <AllAnimalFilters activeCount={activeCount} filters={filters} setFilter={setFilter} resetFilters={resetFilters} />
      <SortFilterSheet value={hasLocation ? filters.sort : "recent"} active={(hasLocation && filters.sort === "distance") || filters.sort === "recent"} hasLocation={hasLocation} onChange={value => setFilter("sort", value)} onReset={() => setFilter("sort", "distance")}/>
      <StatusFilterSheet value={filters.publicStatus} active={filters.publicStatus !== "all"} onChange={value => setFilter("publicStatus", value)} onReset={() => setFilter("publicStatus", "all")}/>
      <BreedFilterSheet filters={filters} location={location} onApply={(species, breedKeys) => { setFilter("species", species); setFilter("breedKeys", breedKeys); }}/>
      <GenderFilterSheet value={filters.sex} active={filters.sex !== "all"} onChange={value => setFilter("sex", value)} onReset={() => setFilter("sex", "all")}/>
      <ColorFilterSheet value={filters.color} active={filters.color !== "all"} onChange={value => setFilter("color", value)} onReset={() => setFilter("color", "all")}/>
      {activeCount>0&&<Chip.Button className="ff-animal-filter-reset" variant="outlineWeak" size="medium" onClick={resetFilters}><Chip.PrefixIcon><Icon svg={<IconXmarkLine/>}/></Chip.PrefixIcon><Chip.Label>전체 초기화</Chip.Label></Chip.Button>}
    </div>
  </div>;
}
