"use client";

import { useEffect, useRef, useState, type CSSProperties } from "react";
import { IconMetroFrontsideLine } from "@karrotmarket/react-monochrome-icon";
import { formatDistance } from "../../lib/geo";

type Station = { name: string; distanceMeters: number | null; url: string | null };

const transitLines = [
  { pattern: /(?:서울|수도권)?([1-9])호선$/, label: (match: RegExpMatchArray) => match[1], color: (match: RegExpMatchArray) => ["", "#0052A4", "#00A84D", "#EF7C1C", "#00A5DE", "#996CAC", "#CD7C2F", "#747F00", "#E6186C", "#BDB092"][Number(match[1])], foreground: (match: RegExpMatchArray) => match[1] === "9" ? "#191919" : "#FFFFFF" },
  { pattern: /인천([12])호선$/, label: (match: RegExpMatchArray) => `인${match[1]}`, color: (match: RegExpMatchArray) => match[1] === "1" ? "#7CA8D5" : "#ED8B00", foreground: () => "#191919" },
  { pattern: /부산([1-4])호선$/, label: (match: RegExpMatchArray) => match[1], color: (match: RegExpMatchArray) => ({ "1": "#F06A00", "2": "#81BF48", "3": "#BB8C00", "4": "#217DCB" })[match[1]]!, foreground: () => "#FFFFFF" },
  { pattern: /대구([1-3])호선$/, label: (match: RegExpMatchArray) => match[1], color: (match: RegExpMatchArray) => ({ "1": "#D93F5C", "2": "#00AA80", "3": "#FFB100" })[match[1]]!, foreground: (match: RegExpMatchArray) => match[1] === "3" ? "#191919" : "#FFFFFF" },
  { pattern: /대전1호선$/, label: () => "1", color: () => "#007448", foreground: () => "#FFFFFF" },
  { pattern: /광주1호선$/, label: () => "1", color: () => "#009088", foreground: () => "#FFFFFF" },
  { pattern: /신분당선$/, label: () => "신분당", color: () => "#D4003B", foreground: () => "#FFFFFF" },
  { pattern: /수인분당선$/, label: () => "수인분당", color: () => "#F5A200", foreground: () => "#191919" },
  { pattern: /경의중앙선$/, label: () => "경의중앙", color: () => "#77C4A3", foreground: () => "#191919" },
  { pattern: /공항철도$/, label: () => "공항", color: () => "#0090D2", foreground: () => "#FFFFFF" },
  { pattern: /경춘선$/, label: () => "경춘", color: () => "#0C8E72", foreground: () => "#FFFFFF" },
  { pattern: /경강선$/, label: () => "경강", color: () => "#003DA5", foreground: () => "#FFFFFF" },
  { pattern: /서해선$/, label: () => "서해", color: () => "#8FC31F", foreground: () => "#191919" },
  { pattern: /우이신설선$/, label: () => "우이신설", color: () => "#B7C452", foreground: () => "#191919" },
  { pattern: /신림선$/, label: () => "신림", color: () => "#6789CA", foreground: () => "#FFFFFF" },
  { pattern: /김포골드라인$/, label: () => "김포", color: () => "#A17800", foreground: () => "#FFFFFF" },
] as const;

function stationPresentation(value: string) {
  for (const line of transitLines) {
    const match = value.match(line.pattern);
    if (!match) continue;
    return {
      stationName: value.slice(0, match.index).trim(),
      lineName: match[0],
      lineLabel: line.label(match),
      style: {
        "--ff-transit-line-color": line.color(match),
        "--ff-transit-line-foreground": line.foreground(match),
      } as CSSProperties,
    };
  }
  return { stationName: value, lineName: "", lineLabel: "", style: undefined };
}

export function NearbyTransitRow({ lat, lng }: { lat: number; lng: number }) {
  const [station, setStation] = useState<Station | null>(null);
  const [visible, setVisible] = useState(false);
  const anchorRef = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    const element = anchorRef.current;
    if (!element || typeof IntersectionObserver === "undefined") {
      setVisible(true);
      return;
    }
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setVisible(true);
          observer.disconnect();
        }
      },
      { rootMargin: "600px" },
    );
    observer.observe(element);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (!visible) return;
    const controller = new AbortController();
    const params = new URLSearchParams({ lat: String(lat), lng: String(lng) });
    void fetch(`/api/maps/nearby-transit?${params}`, { signal: controller.signal })
      .then(async (response) => response.ok ? response.json() as Promise<{ station?: Station }> : null)
      .then((result) => setStation(result?.station || null))
      .catch(() => undefined);
    return () => controller.abort();
  }, [lat, lng, visible]);

  if (!station) return <span ref={anchorRef} aria-hidden="true" />;
  const presentation = stationPresentation(station.name);
  const content = <strong className="ff-transit-station">
    <span>{presentation.stationName}</span>
    {presentation.lineLabel && <span className="ff-transit-line-icon" style={presentation.style} aria-label={presentation.lineName}>{presentation.lineLabel}</span>}
    {station.distanceMeters !== null && <span className="ff-transit-distance">· {formatDistance(station.distanceMeters)}</span>}
  </strong>;

  return <>
    <span ref={anchorRef} aria-hidden="true" />
    <div className="ff-shelter-transit-row">
    <IconMetroFrontsideLine aria-hidden="true"/>
    <span>대중교통</span>
    {station.url
      ? <a href={station.url} target="_blank" rel="noreferrer" aria-label={`${station.name} 카카오맵에서 보기, 새 창`}>{content}</a>
      : content}
    </div>
  </>;
}
