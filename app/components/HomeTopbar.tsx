"use client";

import { useEffect, useState } from "react";
import { BottomSheetBody, BottomSheetContent, BottomSheetRoot, BottomSheetTrigger } from "seed-design/ui/bottom-sheet";
import { TextField, TextFieldInput } from "seed-design/ui/text-field";
import { IconChevronDownLine, IconChevronLeftLine, IconChevronRightLine, IconLocationpinFill, IconLocationpinLine, IconPlusLine, IconQuestionmarkCircleLine, IconXmarkLine } from "@karrotmarket/react-monochrome-icon";
import type { HomeLocation } from "../../lib/geo";
import { readHomeLocation } from "../../lib/geo";
import { useAppFeedback } from "./AppFeedback";
import { NotificationBell } from "./NotificationBell";
import { GlobalMenuButton } from "./GlobalMenuButton";

function savedLocations() {
  try {
    const rows = JSON.parse(window.localStorage.getItem("ff-home-locations") || "[]") as HomeLocation[];
    if (Array.isArray(rows) && rows.length) return rows.filter((row) => Number.isFinite(row.lat) && Number.isFinite(row.lng)).slice(0, 2);
  } catch { /* 이전 단일 동네 저장값으로 복구합니다. */ }
  const legacy = readHomeLocation();
  return legacy ? [legacy] : [];
}

export function HomeTopbar() {
  const [region, setRegion] = useState("지역 설정");
  const [neighborhoods, setNeighborhoods] = useState<HomeLocation[]>([]);
  const [draft, setDraft] = useState("");
  const [results, setResults] = useState<HomeLocation[]>([]);
  const [searching, setSearching] = useState(false);
  const [regionOpen, setRegionOpen] = useState(false);
  const [mode, setMode] = useState<"manage" | "search">("manage");
  const feedback = useAppFeedback();

  useEffect(() => {
    async function hydrate() {
      await Promise.resolve();
      const local = savedLocations();
      if (local.length) {
        setNeighborhoods(local);
        setRegion(local[0].label);
        return;
      }
      const ipLocation = await fetch("/api/location/default").then((response) => response.json()).then((body) => body.location as HomeLocation | null).catch(() => null);
      if (ipLocation) {
        window.localStorage.setItem("ff-ip-location", JSON.stringify(ipLocation));
        setRegion(ipLocation.label);
        window.dispatchEvent(new CustomEvent("ff-region-change", { detail: ipLocation }));
      }
      const body = await fetch("/api/profile").then((response) => response.json()).catch(() => ({}));
      if (!body.homeRegion) return;
      const locationBody = await fetch(`/api/locations?q=${encodeURIComponent(body.homeRegion)}`).then((response) => response.json()).catch(() => ({}));
      const restored = locationBody.locations?.[0] as HomeLocation | undefined;
      if (restored) store([restored]);
      else setRegion(body.homeRegion);
    }
    void hydrate();
  }, []);

  useEffect(() => {
    if (!regionOpen || mode !== "search" || draft.trim().length < 1) return;
    const controller = new AbortController();
    const timer = window.setTimeout(async () => {
      setSearching(true);
      try {
        const response = await fetch(`/api/locations?q=${encodeURIComponent(draft.trim())}`, { signal: controller.signal });
        const body = await response.json();
        setResults(response.ok ? body.locations || [] : []);
      } catch {
        if (!controller.signal.aborted) setResults([]);
      } finally {
        if (!controller.signal.aborted) setSearching(false);
      }
    }, 250);
    return () => { controller.abort(); window.clearTimeout(timer); };
  }, [draft, mode, regionOpen]);

  function store(next: HomeLocation[]) {
    const limited = next.slice(0, 2);
    setNeighborhoods(limited);
    if (!limited.length) {
      setRegion("지역 설정");
      window.localStorage.removeItem("ff-home-region");
      window.localStorage.removeItem("ff-home-location");
      window.localStorage.removeItem("ff-home-locations");
      window.localStorage.removeItem("ff-ip-location");
      window.dispatchEvent(new Event("ff-region-change"));
      return;
    }
    const active = limited[0];
    setRegion(active.label);
    window.localStorage.setItem("ff-home-region", active.label);
    window.localStorage.setItem("ff-home-location", JSON.stringify(active));
    window.localStorage.setItem("ff-home-locations", JSON.stringify(limited));
    window.localStorage.removeItem("ff-ip-location");
    window.dispatchEvent(new CustomEvent("ff-region-change", { detail: active }));
    void fetch("/api/profile", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ homeRegion: active.label }),
    });
  }

  function activate(item: HomeLocation) {
    store([item, ...neighborhoods.filter((row) => row.label !== item.label)]);
    feedback.success(`${item.label} 가까운 순으로 바꿨어요`);
  }

  function add(item: HomeLocation) {
    const existing = neighborhoods.find((row) => row.label === item.label);
    if (existing) activate(existing);
    else if (neighborhoods.length >= 2) {
      feedback.error("동네는 최대 2개까지 설정할 수 있어요");
      return;
    } else {
      store([item, ...neighborhoods]);
      feedback.success(`${item.label}을 내 동네로 추가했어요`);
    }
    setDraft("");
    setResults([]);
    setMode("manage");
  }

  function remove(item: HomeLocation) {
    store(neighborhoods.filter((row) => row.label !== item.label));
    feedback.success("내 동네에서 삭제했어요");
  }

  function openSearch() {
    if (neighborhoods.length >= 2) {
      feedback.error("동네는 최대 2개까지 설정할 수 있어요");
      return;
    }
    setDraft("");
    setResults([]);
    setMode("search");
  }

  return <header className="ff-topbar ff-home-topbar">
    <BottomSheetRoot open={regionOpen} onOpenChange={(open) => { setRegionOpen(open); if (!open) setMode("manage"); }}>
      <BottomSheetTrigger asChild>
        <button className="ff-home-region" type="button" aria-label={`현재 지역 ${region}, 지역 변경`}>
          <IconLocationpinFill aria-hidden /><span>{region}</span><IconChevronDownLine aria-hidden />
        </button>
      </BottomSheetTrigger>
      <BottomSheetContent
        title={mode === "manage" ? "내 동네 설정" : "동, 읍, 면으로 검색"}
        description={mode === "manage" ? "최대 2개의 동네를 선택할 수 있어요." : "정확한 집 주소 대신 활동할 동네만 선택해요."}
      >
        <BottomSheetBody>
          {mode === "manage" ? <div className="ff-neighborhood-manager">
            <div className="ff-neighborhood-list">
              {neighborhoods.map((item, index) => <div className="ff-neighborhood-row" key={item.label}>
                <button type="button" className="ff-neighborhood-select" onClick={() => activate(item)} aria-label={`${item.label}${index === 0 ? ", 현재 선택됨" : ", 이 동네로 전환"}`}>
                  <span className={index === 0 ? "ff-neighborhood-radio is-active" : "ff-neighborhood-radio"} />
                  <strong>{item.label}</strong>
                </button>
                <button type="button" className="ff-neighborhood-remove" onClick={() => remove(item)} aria-label={`${item.label} 삭제`}><IconXmarkLine aria-hidden /></button>
              </div>)}
              {!neighborhoods.length && <div className="ff-neighborhood-empty"><IconLocationpinLine aria-hidden /><strong>아직 설정한 동네가 없어요</strong><span>가까운 보호소와 친구를 찾을 동네를 추가해 주세요.</span></div>}
            </div>
            <button type="button" className="ff-neighborhood-add" onClick={openSearch} disabled={neighborhoods.length >= 2}><IconPlusLine aria-hidden />동네 추가</button>
            <a className="ff-neighborhood-help" href="/privacy"><IconQuestionmarkCircleLine aria-hidden />내 동네 설정이 무엇인가요?</a>
          </div> : <div className="ff-neighborhood-search">
            <div className="ff-neighborhood-searchbar">
              <button type="button" onClick={() => setMode("manage")} aria-label="동네 설정으로 돌아가기"><IconChevronLeftLine aria-hidden /></button>
              <TextField>
                <TextFieldInput aria-label="동네 검색" value={draft} onChange={(event) => setDraft(event.target.value)} placeholder="동, 읍, 면으로 검색" autoComplete="off" />
              </TextField>
              <button type="button" onClick={() => setMode("manage")}>닫기</button>
            </div>
            <div className="ff-neighborhood-result-title">{draft.trim() ? "검색한 동네" : "동네 이름을 입력해 주세요"}</div>
            <div className="ff-neighborhood-results" role="listbox" aria-label="동네 검색 결과">
              {searching && <div className="ff-region-searching">동네를 찾고 있어요…</div>}
              {!searching && results.map((item) => <button type="button" role="option" aria-selected="false" key={`${item.label}-${item.lat}-${item.lng}`} onClick={() => add(item)}>
                <span>{item.label}</span><IconChevronRightLine aria-hidden />
              </button>)}
              {!searching && draft.trim() && !results.length && <div className="ff-region-searching">검색 결과가 없어요. 시·군·구를 함께 입력해 보세요.</div>}
            </div>
          </div>}
        </BottomSheetBody>
      </BottomSheetContent>
    </BottomSheetRoot>
    <div className="ff-top-actions">
      <NotificationBell home />
      <GlobalMenuButton />
    </div>
  </header>;
}
