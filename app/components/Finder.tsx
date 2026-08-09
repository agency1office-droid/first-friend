"use client";
import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { animals } from "../../lib/data";
import { AnimalCard } from "./AnimalCard";

export function Finder() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const drawing = useRef(false);
  const [filter, setFilter] = useState("전체");
  const [query, setQuery] = useState("");
  const [matched, setMatched] = useState(false);
  const [uploaded, setUploaded] = useState("");
  useEffect(() => {
    const canvas = canvasRef.current; if (!canvas) return;
    const rect = canvas.getBoundingClientRect(); const ratio = window.devicePixelRatio || 1;
    canvas.width = rect.width * ratio; canvas.height = 260 * ratio;
    const ctx = canvas.getContext("2d"); if (!ctx) return; ctx.scale(ratio, ratio); ctx.lineWidth = 5; ctx.lineCap = "round"; ctx.strokeStyle = "#386f59";
  }, []);
  function point(event: React.PointerEvent<HTMLCanvasElement>) { const rect = event.currentTarget.getBoundingClientRect(); return { x: event.clientX - rect.left, y: event.clientY - rect.top }; }
  function start(event: React.PointerEvent<HTMLCanvasElement>) { drawing.current = true; event.currentTarget.setPointerCapture(event.pointerId); const ctx = event.currentTarget.getContext("2d"); const p = point(event); ctx?.beginPath(); ctx?.moveTo(p.x,p.y); }
  function move(event: React.PointerEvent<HTMLCanvasElement>) { if (!drawing.current) return; const p = point(event); const ctx = event.currentTarget.getContext("2d"); ctx?.lineTo(p.x,p.y); ctx?.stroke(); }
  function clear() { const canvas = canvasRef.current; const ctx = canvas?.getContext("2d"); if (canvas && ctx) ctx.clearRect(0,0,canvas.width,canvas.height); setMatched(false); }
  const visible = animals.filter((a) => (filter === "전체" || a.species === filter || a.ageGroup === filter) && `${a.name} ${a.region} ${a.traits.join(" ")}`.includes(query));
  return <>
    <section className="match-panel">
      <span className="eyebrow">그림 매칭 체험</span><h2 className="section-title" style={{margin:"7px 0 8px"}}>어떤 친구를 기다리고 있나요?</h2><p className="page-subtitle">손가락이나 마우스로 자유롭게 그리거나 참고 사진을 올려주세요.</p>
      <div className="canvas-wrap"><canvas ref={canvasRef} className="draw-canvas" aria-label="친구를 그리는 캔버스" onPointerDown={start} onPointerMove={move} onPointerUp={() => drawing.current=false} onPointerCancel={() => drawing.current=false} /></div>
      <div className="canvas-actions"><button className="secondary-button" type="button" onClick={clear}>다시 그리기</button><label className="upload-label">사진 올리기<input type="file" accept="image/jpeg,image/png,image/webp" onChange={(e) => setUploaded(e.target.files?.[0]?.name || "")} /></label><button className="primary-button" type="button" onClick={() => setMatched(true)}>닮은 친구 찾기</button></div>
      {uploaded && <p className="page-subtitle" style={{margin:"10px 0 0"}}>선택한 사진: {uploaded}</p>}
      {matched && <div className="match-result" role="status"><strong>보미가 가장 닮았어요.</strong><p>{animals[0].matchReason}</p><Link className="text-link" href="/friends/bomi">보미 만나보기 →</Link></div>}
    </section>
    <section className="section"><div className="section-head"><h2 className="section-title">조건으로 찾아보기</h2><span className="eyebrow">{visible.length} friends</span></div><div className="search-box"><span aria-hidden="true">⌕</span><input value={query} onChange={(e)=>setQuery(e.target.value)} placeholder="이름, 지역, 성격으로 검색" aria-label="보호동물 검색" /></div><div className="filter-row">{["전체","고양이","강아지","어른 친구","어린 친구"].map((item)=><button key={item} className={`filter-chip ${filter===item?"active":""}`} onClick={()=>setFilter(item)}>{item}</button>)}</div><div className="animal-grid">{visible.map((animal)=><AnimalCard animal={animal} key={animal.id} />)}</div>{visible.length===0 && <div className="empty-state">조건에 맞는 친구가 아직 없어요.<br />지역이나 조건을 조금 넓혀보세요.</div>}</section>
  </>;
}
