"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { animals } from "../../lib/data";
import { AnimalCard } from "./AnimalCard";
import { ActionButton } from "seed-design/ui/action-button";
import { TextField, TextFieldInput } from "seed-design/ui/text-field";
import { PrefixIcon } from "@seed-design/react";
import {
  IconCameraLine,
  IconEraserHorizlineLine,
  IconMagnifyingglassLine,
  IconMagnifyingglassSparkleLine,
} from "@karrotmarket/react-monochrome-icon";

export function Finder() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const drawing = useRef(false);
  const [filter, setFilter] = useState("전체");
  const [query, setQuery] = useState("");
  const [matched, setMatched] = useState(false);
  const [uploaded, setUploaded] = useState("");

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const ratio = window.devicePixelRatio || 1;
    canvas.width = rect.width * ratio;
    canvas.height = 250 * ratio;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.scale(ratio, ratio);
    ctx.lineWidth = 5;
    ctx.lineCap = "round";
    ctx.strokeStyle = "#ff6f0f";
  }, []);

  function point(event: React.PointerEvent<HTMLCanvasElement>) {
    const rect = event.currentTarget.getBoundingClientRect();
    return { x: event.clientX - rect.left, y: event.clientY - rect.top };
  }

  function start(event: React.PointerEvent<HTMLCanvasElement>) {
    drawing.current = true;
    event.currentTarget.setPointerCapture(event.pointerId);
    const p = point(event);
    const ctx = event.currentTarget.getContext("2d");
    ctx?.beginPath();
    ctx?.moveTo(p.x, p.y);
  }

  function move(event: React.PointerEvent<HTMLCanvasElement>) {
    if (!drawing.current) return;
    const p = point(event);
    const ctx = event.currentTarget.getContext("2d");
    ctx?.lineTo(p.x, p.y);
    ctx?.stroke();
  }

  function clear() {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (canvas && ctx) ctx.clearRect(0, 0, canvas.width, canvas.height);
    setMatched(false);
  }

  const visible = animals.filter(
    (animal) =>
      (filter === "전체" || animal.species === filter || animal.ageGroup === filter) &&
      `${animal.name} ${animal.region} ${animal.traits.join(" ")}`.includes(query),
  );

  return <>
    <section className="ff-canvas-panel">
      <div className="ff-kicker">그림 매칭</div>
      <h2 className="ff-section-title" style={{ margin: "4px 0 6px" }}>찾고 싶은 친구를 그려보세요</h2>
      <p className="ff-description" style={{ marginBottom: 16 }}>그림을 그리거나 참고 사진을 올리면 닮은 외형의 친구를 보여드려요.</p>
      <canvas ref={canvasRef} className="ff-canvas" aria-label="친구를 그리는 캔버스" onPointerDown={start} onPointerMove={move} onPointerUp={() => drawing.current = false} onPointerCancel={() => drawing.current = false} />
      <div className="ff-actions">
        <ActionButton variant="neutralWeak" onClick={clear}><PrefixIcon svg={<IconEraserHorizlineLine />} />지우기</ActionButton>
        <label className="ff-upload" htmlFor="finder-photo" aria-label="사진 선택"><ActionButton asChild variant="neutralWeak"><span><PrefixIcon svg={<IconCameraLine />} />사진 선택</span></ActionButton><input id="finder-photo" type="file" accept="image/jpeg,image/png,image/webp" onChange={(event) => setUploaded(event.target.files?.[0]?.name || "")} /></label>
      </div>
      {uploaded && <p className="ff-description" style={{ marginTop: 8 }}>선택한 사진: {uploaded}</p>}
      <div style={{ marginTop: 8 }}><ActionButton size="large" className="ff-action-link" onClick={() => setMatched(true)}><PrefixIcon svg={<IconMagnifyingglassSparkleLine />} />닮은 친구 찾기</ActionButton></div>
      {matched && <div className="ff-match-result" role="status"><strong>보미가 가장 닮았어요</strong><p className="ff-description" style={{ margin: "5px 0 8px" }}>{animals[0].matchReason}</p><Link href="/friends/bomi" className="ff-more">보미 자세히 보기</Link></div>}
    </section>
    <section className="ff-section">
      <h2 className="ff-section-title">조건으로 찾기</h2>
      <div style={{ marginTop: 14 }}><TextField prefixIcon={<IconMagnifyingglassLine />} aria-label="보호동물 검색"><TextFieldInput value={query} onChange={(event) => setQuery(event.target.value)} placeholder="이름, 지역, 성격으로 검색" /></TextField></div>
      <div className="ff-filter-bar">{["전체", "고양이", "강아지", "어른 친구", "어린 친구"].map((item) => <button key={item} className="ff-filter-button" data-active={filter === item} onClick={() => setFilter(item)}>{item}</button>)}</div>
      <div className="ff-animal-grid">{visible.map((animal) => <AnimalCard animal={animal} key={animal.id} />)}</div>
      {!visible.length && <div className="ff-empty">조건에 맞는 친구가 아직 없어요.</div>}
    </section>
  </>;
}
