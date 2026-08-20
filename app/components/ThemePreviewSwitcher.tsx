"use client";

import { useEffect, useState } from "react";
import { Palette } from "lucide-react";

type ThemeId = "default" | "terracotta" | "latte" | "beige";

const themes: { id: ThemeId; label: string; color: string }[] = [
  { id: "default", label: "기본 오렌지", color: "#ff6f00" },
  { id: "terracotta", label: "테라코타", color: "#a9684b" },
  { id: "latte", label: "라이트 브라운", color: "#b58b70" },
  { id: "beige", label: "베이지", color: "#c99d62" },
];

const themeTokens: Record<ThemeId, Record<string, string>> = {
  default: {},
  terracotta: {
    "--seed-color-bg-brand-solid": "#a9684b",
    "--seed-color-bg-brand-weak": "#f8eee8",
    "--seed-color-bg-brand-weak-pressed": "#f1dfd6",
    "--seed-color-fg-brand": "#92543b",
    "--seed-color-stroke-brand-solid": "#a9684b",
    "--seed-color-stroke-brand-weak": "#e4b9a7",
  },
  latte: {
    "--seed-color-bg-brand-solid": "#b58b70",
    "--seed-color-bg-brand-weak": "#f7f0eb",
    "--seed-color-bg-brand-weak-pressed": "#eee2d8",
    "--seed-color-fg-brand": "#8e6349",
    "--seed-color-stroke-brand-solid": "#b58b70",
    "--seed-color-stroke-brand-weak": "#ddc5b4",
  },
  beige: {
    "--seed-color-bg-brand-solid": "#c08a4a",
    "--seed-color-bg-brand-weak": "#faf2e4",
    "--seed-color-bg-brand-weak-pressed": "#f2e2c8",
    "--seed-color-fg-brand": "#926326",
    "--seed-color-stroke-brand-solid": "#c08a4a",
    "--seed-color-stroke-brand-weak": "#e6c896",
  },
};

const themeTokenKeys = Object.keys(themeTokens.terracotta);

const storageKey = "ff-theme-preview";

export function ThemePreviewSwitcher() {
  const [open, setOpen] = useState(false);
  const [theme, setTheme] = useState<ThemeId>(() => {
    if (typeof window === "undefined") return "default";
    const saved = window.localStorage.getItem(storageKey) as ThemeId | null;
    return saved && themes.some((item) => item.id === saved) ? saved : "default";
  });

  useEffect(() => {
    const root = document.documentElement;
    themeTokenKeys.forEach((key) => root.style.removeProperty(key));
    Object.entries(themeTokens[theme]).forEach(([key, value]) => root.style.setProperty(key, value));
    if (theme === "default") {
      root.removeAttribute("data-ff-theme");
    } else {
      root.dataset.ffTheme = theme;
    }
  }, [theme]);

  function selectTheme(next: ThemeId) {
    setTheme(next);
    window.localStorage.setItem(storageKey, next);
  }

  return <aside className="ff-theme-preview" aria-label="브랜드 색상 비교">
    {open && <div className="ff-theme-preview-menu" role="menu" aria-label="테마 선택">
      <strong>색상 비교</strong>
      <span>대표 색상을 눌러 비교해 보세요.</span>
      <div className="ff-theme-preview-options">
        {themes.map((item) => <button key={item.id} type="button" role="menuitemradio" aria-checked={theme === item.id} data-active={theme === item.id} onClick={() => selectTheme(item.id)}>
          <i style={{ background: item.color }} aria-hidden="true" />
          <span>{item.label}</span>
          {theme === item.id && <b aria-hidden="true">✓</b>}
        </button>)}
      </div>
    </div>}
    <button className="ff-theme-preview-trigger" type="button" aria-expanded={open} aria-label="브랜드 색상 비교 열기" onClick={() => setOpen((value) => !value)}>
      <span className="ff-theme-preview-dot" style={{ background: themes.find((item) => item.id === theme)?.color }} aria-hidden="true" />
      <Palette size={20} strokeWidth={2} aria-hidden="true" />
    </button>
  </aside>;
}
