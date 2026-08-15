/* eslint-disable @next/next/no-img-element */
"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { getStroke } from "perfect-freehand";
import type { Animal } from "../../lib/data";
import { analyzeVisual, animalVisualTags, preloadVisualModel, type VisualAnalysis } from "../../lib/visual-analysis";
import { AnimalCard } from "./AnimalCard";
import { ActionButton } from "seed-design/ui/action-button";
import { TextField, TextFieldInput } from "seed-design/ui/text-field";
import { Chip } from "seed-design/ui/chip";
import { Callout } from "seed-design/ui/callout";
import { PrefixIcon } from "@seed-design/react";
import { IconCameraLine, IconArrowDownHorizlineLine, IconEraserHorizlineLine, IconMagnifyingglassLine, IconMagnifyingglassSparkleLine, IconPictureLine, IconArrowCounterclockwiseCircularLine } from "@karrotmarket/react-monochrome-icon";
import { useAppFeedback } from "./AppFeedback";

const palette = [
  { name: "검정", hex: "#242424" }, { name: "흰색", hex: "#ffffff" }, { name: "회색", hex: "#8b8b8b" },
  { name: "갈색", hex: "#8a5a35" }, { name: "치즈", hex: "#e89b32" }, { name: "크림", hex: "#ead8b5" },
];

type Mode = "draw" | "photo" | "conditions";

export function Finder({ animals, modeOnly, initialTags = "" }: { animals: Animal[]; modeOnly?: Mode; initialTags?: string }) {
  const feedback = useAppFeedback();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const imageRef = useRef<HTMLImageElement>(null);
  const drawing = useRef(false);
  const strokePoints = useRef<[number, number, number][]>([]);
  const strokeBaseImage = useRef<ImageData | null>(null);
  const undoStack = useRef<ImageData[]>([]);
  const mode = modeOnly || "draw";
  const [brushColor, setBrushColor] = useState(palette[0]);
  const [brushSize, setBrushSize] = useState(6);
  const [thinning, setThinning] = useState(0.35);
  const [smoothing, setSmoothing] = useState(0.65);
  const [streamline, setStreamline] = useState(0.45);
  const [simulatePressure, setSimulatePressure] = useState(true);
  const [roundCaps, setRoundCaps] = useState(true);
  const [taperEnds, setTaperEnds] = useState(false);
  const [uploaded, setUploaded] = useState("");
  const [preview, setPreview] = useState("");
  const [query, setQuery] = useState(initialTags.split(",")[0] || "");
  const [species, setSpecies] = useState("전체");
  const [breed, setBreed] = useState("상관 없음");
  const [coat, setCoat] = useState("상관 없음");
  const [age, setAge] = useState("상관 없음");
  const [gender, setGender] = useState("상관 없음");
  const [region, setRegion] = useState("전국");
  const [matched, setMatched] = useState(false);
  const [ranked, setRanked] = useState(animals);
  const [analysis, setAnalysis] = useState<VisualAnalysis | null>(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [saveState, setSaveState] = useState("");

  const breeds = useMemo(() => ["상관 없음", ...Array.from(new Set(animals.map((animal) => animal.breed))).slice(0, 30)], [animals]);
  const regions = useMemo(() => ["전국", ...Array.from(new Set(animals.map((animal) => animal.region.split(" ")[0]))).filter(Boolean)], [animals]);

  useEffect(() => {
    if (mode === "draw" || mode === "photo") preloadVisualModel();
  }, [mode]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ratio = window.devicePixelRatio || 1;
    const width = canvas.getBoundingClientRect().width;
    canvas.width = width * ratio;
    canvas.height = 280 * ratio;
    const context = canvas.getContext("2d");
    if (!context) return;
    context.scale(ratio, ratio);
    context.fillStyle = "#ffffff";
    context.fillRect(0, 0, width, 280);
    context.lineCap = "round";
    context.lineJoin = "round";
  }, []);

  function point(event: React.PointerEvent<HTMLCanvasElement>): [number, number, number] { const rect = event.currentTarget.getBoundingClientRect(); return [event.clientX - rect.left, event.clientY - rect.top, event.pressure || 0.5]; }
  function drawSmoothStroke(context: CanvasRenderingContext2D, points: [number, number, number][]) {
    if (!points.length) return;
    const outline = getStroke(points, { size: brushSize, thinning, smoothing, streamline, simulatePressure, last: true, start: { cap: roundCaps, taper: taperEnds }, end: { cap: roundCaps, taper: taperEnds } });
    context.beginPath();
    context.moveTo(outline[0][0], outline[0][1]);
    for (const [x, y] of outline.slice(1)) context.lineTo(x, y);
    context.closePath();
    context.fillStyle = brushColor.hex;
    context.fill();
  }
  function start(event: React.PointerEvent<HTMLCanvasElement>) { const canvas = event.currentTarget, context = canvas.getContext("2d"); if (!context) return; strokeBaseImage.current = context.getImageData(0, 0, canvas.width, canvas.height); undoStack.current.push(strokeBaseImage.current); if (undoStack.current.length > 12) undoStack.current.shift(); drawing.current = true; strokePoints.current = [point(event)]; canvas.setPointerCapture(event.pointerId); drawSmoothStroke(context, strokePoints.current); }
  function move(event: React.PointerEvent<HTMLCanvasElement>) { if (!drawing.current) return; const context = event.currentTarget.getContext("2d"); if (!context || !strokeBaseImage.current) return; strokePoints.current.push(point(event)); context.putImageData(strokeBaseImage.current, 0, 0); drawSmoothStroke(context, strokePoints.current); }
  function finish(event: React.PointerEvent<HTMLCanvasElement>) { drawing.current = false; strokePoints.current = []; strokeBaseImage.current = null; if (event.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId); }
  function clear() { const canvas = canvasRef.current, context = canvas?.getContext("2d"); if (!canvas || !context) return; undoStack.current.push(context.getImageData(0, 0, canvas.width, canvas.height)); context.save(); context.setTransform(1, 0, 0, 1, 0, 0); context.fillStyle = "#fff"; context.fillRect(0, 0, canvas.width, canvas.height); context.restore(); setMatched(false); setAnalysis(null); }
  function undo() { const canvas = canvasRef.current, context = canvas?.getContext("2d"), previous = undoStack.current.pop(); if (canvas && context && previous) context.putImageData(previous, 0, 0); }
  function saveDrawing() { const link = document.createElement("a"); link.download = `퍼스트프렌드-그림-${new Date().toISOString().slice(0, 10)}.png`; link.href = canvasRef.current?.toDataURL("image/png") || ""; link.click(); }
  function upload(event: React.ChangeEvent<HTMLInputElement>) { const file = event.target.files?.[0]; if (!file) return; if (preview) URL.revokeObjectURL(preview); setUploaded(file.name); setPreview(URL.createObjectURL(file)); setMatched(false); setAnalysis(null); }

  function score(animal: Animal, visual = analysis) {
    let value = 0;
    const haystack = `${animal.name} ${animal.breed} ${animal.species} ${animal.ageGroup} ${animal.sex} ${animal.region} ${animal.colors.join(" ")} ${animal.traits.join(" ")}`.toLowerCase();
    if (species !== "전체") value += animal.species.includes(species) ? 30 : -50;
    if (breed !== "상관 없음") value += haystack.includes(breed.toLowerCase()) ? 22 : -4;
    const wantedCoat = coat !== "상관 없음" ? coat : mode === "draw" ? brushColor.name : "";
    if (wantedCoat) value += haystack.includes(wantedCoat.toLowerCase()) ? 18 : 0;
    if (age !== "상관 없음") value += animal.ageGroup === age ? 12 : -2;
    if (gender !== "상관 없음") value += animal.sex.includes(gender) ? 8 : 0;
    if (region !== "전국") value += animal.region.startsWith(region) ? 12 : 0;
    if (query && haystack.includes(query.toLowerCase())) value += 15;
    if (visual) {
      const animalTags = animalVisualTags(animal);
      if (visual.species !== "전체") value += animal.species.includes(visual.species) ? 38 : -55;
      for (const color of visual.colors) if (animal.colors.some((item) => item.includes(color) || color.includes(item))) value += 10;
      for (const hint of visual.breedHints) if (animal.breed.includes(hint) || hint.includes(animal.breed)) value += 16;
      for (const tag of [visual.size, visual.eyes, visual.fur, visual.pattern]) if (animalTags.includes(tag)) value += 6;
    }
    value += Math.max(0, 6 - animals.indexOf(animal) * 0.1);
    return value;
  }

  async function match() {
    setAnalyzing(true); setSaveState(""); let visual: VisualAnalysis | null = null;
    try {
      if (mode === "draw" && canvasRef.current) visual = await analyzeVisual(canvasRef.current, true);
      if (mode === "photo" && imageRef.current) visual = await analyzeVisual(imageRef.current, false);
      if (visual) { setAnalysis(visual); if (species === "전체" && visual.species !== "전체") setSpecies(visual.species); if (visual.colors[0]) setCoat(visual.colors[0]); }
      const result = [...animals].sort((a, b) => score(b, visual) - score(a, visual)); setRanked(result); setMatched(true); document.getElementById("match-results")?.scrollIntoView({ behavior: "smooth", block: "start" });
    } finally { setAnalyzing(false); }
  }
  async function saveSearch() { const response = await fetch("/api/saved-searches", { method:"POST", headers:{"content-type":"application/json"}, body:JSON.stringify({ name:analysis ? analysis.tags.slice(0,3).join(" · ") : `${species} ${region}`, criteria:{species,breed,coat,age,gender,region,query,tags:analysis?.tags||[]} }) }); if(response.status===401){setSaveState("로그인하면 이 조건과 신규 등록 알림을 저장할 수 있어요.");return;} if(response.ok){setSaveState("");feedback.success("검색 조건과 새 친구 알림을 저장했어요",{actionLabel:"알림관리",onAction:()=>{location.href="/mypage/searches"}})}else feedback.error("검색 조건을 저장하지 못했어요"); }

  const visible = (matched ? ranked : animals).filter((animal) => !query || `${animal.name} ${animal.region} ${animal.traits.join(" ")}`.toLowerCase().includes(query.toLowerCase()));

  return <div className={mode === "draw" ? "ff-drawing-workspace" : undefined}>
    {mode === "draw" && <div className="ff-drawing-topbar"><a href="/find" aria-label="그림 찾기 닫기">‹</a><h1>그림으로 찾기</h1><span>기기 안에서 분석</span></div>}
    {mode === "draw" &&
        <section className="ff-canvas-panel">
          <h2 className="ff-section-title">마음속 친구를 그려보세요</h2><p className="ff-description" style={{ margin: "5px 0 14px" }}>털색과 무늬, 귀와 얼굴 모양을 자유롭게 표현해 주세요.</p>
          <div className="ff-draw-tools" aria-label="그림 도구"><div className="ff-palette">{palette.map((color) => <button type="button" key={color.name} className="ff-color-button" data-active={brushColor.name === color.name} style={{ background: color.hex }} aria-label={`${color.name} 색상`} onClick={() => setBrushColor(color)}/>)}</div><label className="ff-brush-size">굵기 <input type="range" min="2" max="40" value={brushSize} onChange={(event) => setBrushSize(Number(event.target.value))}/><output>{brushSize}</output></label></div>
          <details className="ff-stroke-settings"><summary>선 설정</summary><div className="ff-stroke-settings-grid"><label>압력 반응<input type="range" min="-1" max="1" step="0.05" value={thinning} onChange={(event) => setThinning(Number(event.target.value))}/><output>{Math.round(thinning * 100)}%</output></label><label>선 다듬기<input type="range" min="0" max="1" step="0.05" value={smoothing} onChange={(event) => setSmoothing(Number(event.target.value))}/><output>{Math.round(smoothing * 100)}%</output></label><label>선 따라오기<input type="range" min="0" max="1" step="0.05" value={streamline} onChange={(event) => setStreamline(Number(event.target.value))}/><output>{Math.round(streamline * 100)}%</output></label><label className="ff-pressure-toggle"><input type="checkbox" checked={simulatePressure} onChange={(event) => setSimulatePressure(event.target.checked)}/>속도에 따라 굵기 바꾸기</label><label className="ff-pressure-toggle"><input type="checkbox" checked={roundCaps} onChange={(event) => setRoundCaps(event.target.checked)}/>선 시작과 끝을 둥글게</label><label className="ff-pressure-toggle"><input type="checkbox" checked={taperEnds} onChange={(event) => setTaperEnds(event.target.checked)}/>선 시작과 끝을 가늘게</label></div></details>
          <canvas ref={canvasRef} className="ff-canvas" aria-label="친구를 그리는 캔버스" onPointerDown={start} onPointerMove={move} onPointerUp={finish} onPointerCancel={finish}/>
          <div className="ff-drawing-actions"><ActionButton variant="neutralWeak" size="small" onClick={undo}><PrefixIcon svg={<IconArrowCounterclockwiseCircularLine/>}/>되돌리기</ActionButton><ActionButton variant="neutralWeak" size="small" onClick={clear}><PrefixIcon svg={<IconEraserHorizlineLine/>}/>지우기</ActionButton><ActionButton variant="neutralWeak" size="small" onClick={saveDrawing}><PrefixIcon svg={<IconArrowDownHorizlineLine/>}/>그림 저장</ActionButton></div>
        </section>
    }
    {mode === "photo" &&
        <section className="ff-canvas-panel"><h2 className="ff-section-title">그림이나 참고 사진을 올려주세요</h2><p className="ff-description" style={{ margin: "5px 0 14px" }}>이미지는 기기 안에서 분석하며 서버에 저장하지 않아요. JPG, PNG, WEBP를 사용할 수 있어요.</p><label className="ff-photo-drop" htmlFor="finder-photo"><IconPictureLine/>{preview ? <img ref={imageRef} src={preview} alt="업로드한 참고 이미지 미리보기"/> : <span>사진 또는 저장한 그림 선택</span>}<input id="finder-photo" type="file" accept="image/jpeg,image/png,image/webp" onChange={upload}/></label>{uploaded && <p className="ff-meta" style={{ marginTop: 8 }}>선택한 파일: {uploaded}</p>}</section>
    }
    {mode === "conditions" &&
        <section className="ff-canvas-panel"><h2 className="ff-section-title">원하는 모습을 골라주세요</h2><p className="ff-description" style={{ margin: "5px 0 16px" }}>한 가지만 골라도 되고, 나이는 상관없음으로 둘 수 있어요.</p><div className="ff-condition-grid"><div className="ff-field"><label htmlFor="breed">품종</label><select id="breed" className="ff-native-select" value={breed} onChange={(event) => setBreed(event.target.value)}>{breeds.map((item) => <option key={item}>{item}</option>)}</select></div><div className="ff-field"><label htmlFor="coat">털색·무늬</label><select id="coat" className="ff-native-select" value={coat} onChange={(event) => setCoat(event.target.value)}><option>상관 없음</option>{palette.map((item) => <option key={item.name}>{item.name}</option>)}<option>줄무늬</option><option>삼색</option></select></div><div className="ff-field"><label htmlFor="age">나이</label><select id="age" className="ff-native-select" value={age} onChange={(event) => setAge(event.target.value)}><option>상관 없음</option><option>어린 친구</option><option>어른 친구</option></select></div><div className="ff-field"><label htmlFor="gender">성별</label><select id="gender" className="ff-native-select" value={gender} onChange={(event) => setGender(event.target.value)}><option>상관 없음</option><option>수컷</option><option>암컷</option></select></div><div className="ff-field"><label htmlFor="region">지역</label><select id="region" className="ff-native-select" value={region} onChange={(event) => setRegion(event.target.value)}>{regions.map((item) => <option key={item}>{item}</option>)}</select></div></div></section>
    }

    {mode !== "draw" && <section className="ff-search-options">
      <div className="ff-kicker">공통 조건</div><div className="ff-chip-row"><Chip.RadioRoot value={species} onValueChange={(value) => setSpecies(value as string)}>{["전체", "고양이", "강아지"].map((item) => <Chip.RadioItem value={item} key={item}><Chip.Label>{item}</Chip.Label></Chip.RadioItem>)}</Chip.RadioRoot></div>
      <div style={{ marginTop: 14 }}><TextField prefixIcon={<IconMagnifyingglassLine/>} aria-label="보호동물 검색"><TextFieldInput value={query} onChange={(event) => setQuery(event.target.value)} placeholder="품종, 지역, 특징 검색"/></TextField></div>
      <ActionButton size="large" className="ff-action-link" style={{ marginTop: 12 }} onClick={match} disabled={analyzing || (mode==="photo"&&!preview)}><PrefixIcon svg={mode === "photo" ? <IconCameraLine/> : <IconMagnifyingglassSparkleLine/>}/>{analyzing ? "그림을 살펴보고 있어요…" : "특징을 분석해 친구 찾기"}</ActionButton>
    </section>}

    {mode !== "draw" && matched && <section className="ff-section" id="match-results">
      <div className="ff-section-head"><h2 className="ff-section-title">{matched ? "닮은 순서로 찾은 친구" : "현재 보호 중인 친구"}</h2><span className="ff-meta">{visible.length}마리</span></div>
      {analysis && <div className="ff-analysis-card"><div className="ff-analysis-head"><div><span>온디바이스 시각 분석</span><strong>그림에서 찾은 검색 태그</strong></div><span className="ff-analysis-badge">{analysis.usedOpenSourceModel ? "기기 안에서 분석" : "특징 분석"}</span></div><div className="ff-tags">{analysis.tags.map(tag=><span className="ff-tag" key={tag}>{tag}</span>)}</div><p>색상·그림이 차지하는 면적·어두운 눈 영역·경계 밀도를 태그로 바꿨어요. 그림은 서버에 저장하지 않고 공개된 보호동물 정보와 비교합니다.</p></div>}
      {matched && visible[0] && <Callout tone="positive" title={`${visible[0].name} 친구가 가장 가까워요`} description={`${visible[0].matchReason} 분석 태그와 공개된 품종·털색·체중 단서를 비교했으며 건강·성격·입양 성공은 추측하지 않았어요.`}/>}
      <div className="ff-animal-grid" style={{ marginTop: 14 }}>{visible.map((animal) => <AnimalCard animal={animal} key={animal.id}/>)}</div>
      {!visible.length && <div className="ff-empty"><strong>조건에 맞는 친구가 아직 없어요.</strong><p>지역이나 나이를 넓히거나, 같은 털색의 다른 품종을 살펴보세요.</p><ActionButton variant="neutralWeak" size="small" onClick={()=>{setRegion("전국");setAge("상관 없음");setQuery("");setRanked(animals);}}>조건 넓히기</ActionButton></div>}
      {matched && visible[0] && <div className="ff-result-shortcut"><a href={`/friends/${visible[0].id}`}>첫 번째 친구 자세히 보기</a></div>}
      {matched && <div className="ff-save-search"><ActionButton variant="neutralWeak" onClick={saveSearch}>이 조건과 신규 등록 알림 저장</ActionButton>{saveState&&<p className="ff-meta">{saveState}</p>}</div>}
    </section>}
  </div>;
}
