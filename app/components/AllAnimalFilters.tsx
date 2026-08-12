/* eslint-disable react-hooks/set-state-in-effect -- opening the panel starts its lazy options request */
"use client";

import { useEffect, useState } from "react";
import type { Dispatch, SetStateAction } from "react";
import { IconSlider2HorizontalLine, IconXmarkLine } from "@karrotmarket/react-monochrome-icon";
import { Icon } from "@seed-design/react";
import { ActionButton } from "seed-design/ui/action-button";
import { Checkbox } from "seed-design/ui/checkbox";
import { Chip } from "seed-design/ui/chip";
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

function Group({
  title,
  values,
  selected,
  onToggle,
}: {
  title: string;
  values: string[];
  selected: string[];
  onToggle: (value: string) => void;
}) {
  return (
    <section className="ff-all-filter-group">
      <h2>{title}</h2>
      <div className="ff-all-filter-options">
        {values.map(value => (
          <Checkbox
            key={value}
            checked={selected.includes(value)}
            onCheckedChange={() => onToggle(value)}
            label={value}
          />
        ))}
      </div>
    </section>
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

  const toggle = (setter: Dispatch<SetStateAction<string[]>>) => (value: string) => {
    setter(current => current.includes(value) ? current.filter(item => item !== value) : [...current, value]);
  };

  const openPanel = () => {
    setSpecies(filters.species === "cat" ? ["고양이"] : filters.species === "dog" ? ["개"] : []);
    setBreeds(filters.breedKeys);
    setSex(filters.sex === "female" ? ["암컷"] : filters.sex === "male" ? ["수컷"] : []);
    setColors(filters.color === "all" ? [] : [filters.color]);
    setAges([]);
    setWeights([]);
    setStates([]);
    setRegions([]);
    setError("");
    setOpen(true);
  };

  useEffect(() => {
    if (!open || options) return;
    setLoading(true);
    fetch("/api/animal-filter-options")
      .then(async response => {
        const body = await response.json();
        if (!response.ok) throw new Error(body.error || "공공 API 필터를 불러오지 못했어요.");
        setOptions(body);
      })
      .catch(value => setError(value instanceof Error ? value.message : "공공 API 필터를 불러오지 못했어요."))
      .finally(() => setLoading(false));
  }, [open, options]);

  const apply = () => {
    const selectedSpecies = species.length === 1 && /고양이/.test(species[0])
      ? "cat"
      : species.length === 1 && /개|강아지/.test(species[0])
        ? "dog"
        : "all";
    const selectedSex = sex.length === 1 && sex[0] === "암컷" ? "female" : sex.length === 1 && sex[0] === "수컷" ? "male" : "all";
    setFilter("species", selectedSpecies);
    setFilter("sex", selectedSex);
    setFilter("color", colors.length === 1 ? colors[0] : "all");
    setFilter("breedKeys", breeds.slice(0, 10));
    setOpen(false);
  };

  return (
    <>
      <Chip.Button
        className="ff-all-filter-trigger"
        variant="outlineWeak"
        size="medium"
        onClick={openPanel}
        aria-label={activeCount > 0 ? `전체 필터 열기, ${activeCount}개 선택됨` : "전체 필터 열기"}
        data-checked={activeCount > 0 || undefined}
      >
        <Chip.PrefixIcon><Icon svg={<IconSlider2HorizontalLine />} /></Chip.PrefixIcon>
        {activeCount > 0 && <span className="ff-all-filter-count">{activeCount}</span>}
      </Chip.Button>

      {open && (
        <div className="ff-all-filter-overlay" role="dialog" aria-modal="true" aria-label="공공 API 전체 필터">
          <header className="ff-all-filter-header">
            <div>
              <span className="ff-kicker">공공 API 원문 기준</span>
              <h1>어떤 친구를 찾고 있나요?</h1>
            </div>
            <button type="button" onClick={() => setOpen(false)} aria-label="필터 닫기">
              <IconXmarkLine aria-hidden />
            </button>
          </header>

          <div className="ff-all-filter-content">
            {loading && <div className="ff-all-filter-loading"><LoadingIndicator label="공공 API 필터를 불러오는 중" /></div>}
            {error && <p className="ff-all-filter-error">{error}</p>}
            {options && (
              <>
                <Group title="종류" values={options.species} selected={species} onToggle={toggle(setSpecies)} />
                <section className="ff-all-filter-group">
                  <h2>품종</h2>
                  <div className="ff-all-filter-options">
                    {options.breeds.map(item => (
                      <Checkbox
                        key={item.key}
                        checked={breeds.includes(item.key)}
                        onCheckedChange={() => toggle(setBreeds)(item.key)}
                        label={<span>{item.label}<small>{item.species}</small></span>}
                      />
                    ))}
                  </div>
                </section>
                <Group title="성별" values={options.sex} selected={sex} onToggle={toggle(setSex)} />
                <Group title="털색 원문" values={options.colors} selected={colors} onToggle={toggle(setColors)} />
                <Group title="나이 원문" values={options.ages} selected={ages} onToggle={toggle(setAges)} />
                <Group title="체중 원문" values={options.weights} selected={weights} onToggle={toggle(setWeights)} />
                <Group title="보호 상태 원문" values={options.states} selected={states} onToggle={toggle(setStates)} />
                <Group title="발견 지역 원문" values={options.regions} selected={regions} onToggle={toggle(setRegions)} />
              </>
            )}
          </div>

          <footer className="ff-all-filter-footer">
            <button type="button" onClick={() => { setSpecies([]); setBreeds([]); setSex([]); setColors([]); setAges([]); setWeights([]); setStates([]); setRegions([]); resetFilters(); }}>
              전체 초기화
            </button>
            <ActionButton onClick={apply}>선택 조건 적용</ActionButton>
          </footer>
        </div>
      )}
    </>
  );
}
