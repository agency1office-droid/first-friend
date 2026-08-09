/* eslint-disable @next/next/no-img-element */
"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type { Animal } from "../../lib/data";
import { AnimalCard } from "./AnimalCard";
import { ActionButton } from "seed-design/ui/action-button";
import { TextField, TextFieldInput } from "seed-design/ui/text-field";
import { TabsContent, TabsList, TabsRoot, TabsTrigger } from "seed-design/ui/tabs";
import { Chip } from "seed-design/ui/chip";
import { Callout } from "seed-design/ui/callout";
import { PrefixIcon } from "@seed-design/react";
import { IconCameraLine, IconArrowDownHorizlineLine, IconEraserHorizlineLine, IconMagnifyingglassLine, IconMagnifyingglassSparkleLine, IconPictureLine, IconArrowCounterclockwiseCircularLine } from "@karrotmarket/react-monochrome-icon";

const palette = [
  { name: "검정", hex: "#242424" }, { name: "흰색", hex: "#ffffff" }, { name: "회색", hex: "#8b8b8b" },
  { name: "갈색", hex: "#8a5a35" }, { name: "치즈", hex: "#e89b32" }, { name: "크림", hex: "#ead8b5" },
];

type Mode = "draw" | "photo" | "conditions";

export function Finder({ animals }: { animals: Animal[] }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const drawing = useRef(false);
  const undoStack = useRef<ImageData[]>([]);
  const [mode, setMode] = useState<Mode>("draw");
  const [brushColor, setBrushColor] = useState(palette[0]);
  const [brushSize, setBrushSize] = useState(6);
  const [uploaded, setUploaded] = useState("");
  const [preview, setPreview] = useState("");
  const [query, setQuery] = useState("");
  const [species, setSpecies] = useState("전체");
  const [breed, setBreed] = useState("상관 없음");
  const [coat, setCoat] = useState("상관 없음");
  const [age, setAge] = useState("상관 없음");
  const [gender, setGender] = useState("상관 없음");
  const [region, setRegion] = useState("전국");
  const [matched, setMatched] = useState(false);
  const [ranked, setRanked] = useState(animals);

  const breeds = useMemo(() => ["상관 없음", ...Array.from(new Set(animals.map((animal) => animal.breed))).slice(0, 30)], [animals]);
  const regions = useMemo(() => ["전국", ...Array.from(new Set(animals.map((animal) => animal.region.split(" ")[0]))).filter(Boolean)], [animals]);

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

  function point(event: React.PointerEvent<HTMLCanvasElement>) { const rect = event.currentTarget.getBoundingClientRect(); return { x: event.clientX - rect.left, y: event.clientY - rect.top }; }
  function start(event: React.PointerEvent<HTMLCanvasElement>) { const canvas = event.currentTarget, context = canvas.getContext("2d"); if (!context) return; undoStack.current.push(context.getImageData(0, 0, canvas.width, canvas.height)); if (undoStack.current.length > 12) undoStack.current.shift(); drawing.current = true; canvas.setPointerCapture(event.pointerId); const p = point(event); context.beginPath(); context.moveTo(p.x, p.y); }
  function move(event: React.PointerEvent<HTMLCanvasElement>) { if (!drawing.current) return; const context = event.currentTarget.getContext("2d"); if (!context) return; const p = point(event); context.strokeStyle = brushColor.hex; context.lineWidth = brushSize; context.lineTo(p.x, p.y); context.stroke(); }
  function clear() { const canvas = canvasRef.current, context = canvas?.getContext("2d"); if (!canvas || !context) return; undoStack.current.push(context.getImageData(0, 0, canvas.width, canvas.height)); context.save(); context.setTransform(1, 0, 0, 1, 0, 0); context.fillStyle = "#fff"; context.fillRect(0, 0, canvas.width, canvas.height); context.restore(); setMatched(false); }
  function undo() { const canvas = canvasRef.current, context = canvas?.getContext("2d"), previous = undoStack.current.pop(); if (canvas && context && previous) context.putImageData(previous, 0, 0); }
  function saveDrawing() { const link = document.createElement("a"); link.download = `퍼스트프렌드-그림-${new Date().toISOString().slice(0, 10)}.png`; link.href = canvasRef.current?.toDataURL("image/png") || ""; link.click(); }
  function upload(event: React.ChangeEvent<HTMLInputElement>) { const file = event.target.files?.[0]; if (!file) return; if (preview) URL.revokeObjectURL(preview); setUploaded(file.name); setPreview(URL.createObjectURL(file)); setMatched(false); }

  function score(animal: Animal) {
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
    value += Math.max(0, 6 - animals.indexOf(animal) * 0.1);
    return value;
  }

  function match() { const result = [...animals].sort((a, b) => score(b) - score(a)); setRanked(result); setMatched(true); document.getElementById("match-results")?.scrollIntoView({ behavior: "smooth", block: "start" }); }

  const visible = (matched ? ranked : animals).filter((animal) => !query || `${animal.name} ${animal.region} ${animal.traits.join(" ")}`.toLowerCase().includes(query.toLowerCase()));

  return <>
    <TabsRoot value={mode} onValueChange={(value) => { setMode(value as Mode); setMatched(false); }}>
      <TabsList><TabsTrigger value="draw">직접 그리기</TabsTrigger><TabsTrigger value="photo">사진 올리기</TabsTrigger><TabsTrigger value="conditions">조건으로 찾기</TabsTrigger></TabsList>
      <TabsContent value="draw">
        <section className="ff-canvas-panel">
          <h2 className="ff-section-title">마음속 친구를 그려보세요</h2><p className="ff-description" style={{ margin: "5px 0 14px" }}>털색과 무늬, 귀와 얼굴 모양을 자유롭게 표현해 주세요.</p>
          <div className="ff-draw-tools" aria-label="그림 도구"><div className="ff-palette">{palette.map((color) => <button type="button" key={color.name} className="ff-color-button" data-active={brushColor.name === color.name} style={{ background: color.hex }} aria-label={`${color.name} 색상`} onClick={() => setBrushColor(color)}/>)}</div><label className="ff-brush-size">굵기 <input type="range" min="2" max="22" value={brushSize} onChange={(event) => setBrushSize(Number(event.target.value))}/></label></div>
          <canvas ref={canvasRef} className="ff-canvas" aria-label="친구를 그리는 캔버스" onPointerDown={start} onPointerMove={move} onPointerUp={() => drawing.current = false} onPointerCancel={() => drawing.current = false}/>
          <div className="ff-drawing-actions"><ActionButton variant="neutralWeak" size="small" onClick={undo}><PrefixIcon svg={<IconArrowCounterclockwiseCircularLine/>}/>되돌리기</ActionButton><ActionButton variant="neutralWeak" size="small" onClick={clear}><PrefixIcon svg={<IconEraserHorizlineLine/>}/>지우기</ActionButton><ActionButton variant="neutralWeak" size="small" onClick={saveDrawing}><PrefixIcon svg={<IconArrowDownHorizlineLine/>}/>그림 저장</ActionButton></div>
        </section>
      </TabsContent>
      <TabsContent value="photo">
        <section className="ff-canvas-panel"><h2 className="ff-section-title">그림이나 참고 사진을 올려주세요</h2><p className="ff-description" style={{ margin: "5px 0 14px" }}>JPG, PNG, WEBP 파일을 기기에서 선택할 수 있어요. 원본은 매칭 용도로만 사용합니다.</p><label className="ff-photo-drop" htmlFor="finder-photo"><IconPictureLine/>{preview ? <img src={preview} alt="업로드한 참고 이미지 미리보기"/> : <span>사진 또는 저장한 그림 선택</span>}<input id="finder-photo" type="file" accept="image/jpeg,image/png,image/webp" onChange={upload}/></label>{uploaded && <p className="ff-meta" style={{ marginTop: 8 }}>선택한 파일: {uploaded}</p>}</section>
      </TabsContent>
      <TabsContent value="conditions">
        <section className="ff-canvas-panel"><h2 className="ff-section-title">원하는 모습을 골라주세요</h2><p className="ff-description" style={{ margin: "5px 0 16px" }}>한 가지만 골라도 되고, 나이는 상관없음으로 둘 수 있어요.</p><div className="ff-condition-grid"><div className="ff-field"><label htmlFor="breed">품종</label><select id="breed" className="ff-native-select" value={breed} onChange={(event) => setBreed(event.target.value)}>{breeds.map((item) => <option key={item}>{item}</option>)}</select></div><div className="ff-field"><label htmlFor="coat">털색·무늬</label><select id="coat" className="ff-native-select" value={coat} onChange={(event) => setCoat(event.target.value)}><option>상관 없음</option>{palette.map((item) => <option key={item.name}>{item.name}</option>)}<option>줄무늬</option><option>삼색</option></select></div><div className="ff-field"><label htmlFor="age">나이</label><select id="age" className="ff-native-select" value={age} onChange={(event) => setAge(event.target.value)}><option>상관 없음</option><option>어린 친구</option><option>어른 친구</option></select></div><div className="ff-field"><label htmlFor="gender">성별</label><select id="gender" className="ff-native-select" value={gender} onChange={(event) => setGender(event.target.value)}><option>상관 없음</option><option>수컷</option><option>암컷</option></select></div><div className="ff-field"><label htmlFor="region">지역</label><select id="region" className="ff-native-select" value={region} onChange={(event) => setRegion(event.target.value)}>{regions.map((item) => <option key={item}>{item}</option>)}</select></div></div></section>
      </TabsContent>
    </TabsRoot>

    <section className="ff-search-options">
      <div className="ff-kicker">공통 조건</div><div className="ff-chip-row"><Chip.RadioRoot value={species} onValueChange={(value) => setSpecies(value as string)}>{["전체", "고양이", "강아지"].map((item) => <Chip.RadioItem value={item} key={item}><Chip.Label>{item}</Chip.Label></Chip.RadioItem>)}</Chip.RadioRoot></div>
      <div style={{ marginTop: 14 }}><TextField prefixIcon={<IconMagnifyingglassLine/>} aria-label="보호동물 검색"><TextFieldInput value={query} onChange={(event) => setQuery(event.target.value)} placeholder="품종, 지역, 특징 검색"/></TextField></div>
      <ActionButton size="large" className="ff-action-link" style={{ marginTop: 12 }} onClick={match}><PrefixIcon svg={mode === "photo" ? <IconCameraLine/> : <IconMagnifyingglassSparkleLine/>}/>닮은 친구 찾기</ActionButton>
    </section>

    <section className="ff-section" id="match-results">
      <div className="ff-section-head"><h2 className="ff-section-title">{matched ? "닮은 순서로 찾은 친구" : "현재 보호 중인 친구"}</h2><span className="ff-meta">{visible.length}마리</span></div>
      {matched && visible[0] && <Callout tone="positive" title={`${visible[0].name} 친구가 가장 가까워요`} description={`${visible[0].matchReason} 공공데이터에 없는 건강·성격 정보는 추측하지 않았어요.`}/>}
      <div className="ff-animal-grid" style={{ marginTop: 14 }}>{visible.map((animal) => <AnimalCard animal={animal} key={animal.id}/>)}</div>
      {!visible.length && <div className="ff-empty">조건에 맞는 친구가 아직 없어요. 조건을 조금 넓혀보세요.</div>}
      {matched && visible[0] && <div className="ff-result-shortcut"><a href={`/friends/${visible[0].id}`}>첫 번째 친구 자세히 보기</a></div>}
    </section>
  </>;
}
