/* eslint-disable @next/next/no-img-element */
"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { getStroke } from "perfect-freehand";
import type { Animal } from "../../lib/data";
import { analyzeVisual, animalVisualTags, type VisualAnalysis } from "../../lib/visual-analysis";
import { AnimalCard } from "./AnimalCard";
import { ActionButton } from "seed-design/ui/action-button";
import { TextField, TextFieldInput } from "seed-design/ui/text-field";
import { Chip } from "seed-design/ui/chip";
import { Callout } from "seed-design/ui/callout";
import { PrefixIcon } from "@seed-design/react";
import { BottomSheetBody, BottomSheetContent, BottomSheetRoot } from "seed-design/ui/bottom-sheet";
import { IconCameraLine, IconMagnifyingglassLine, IconMagnifyingglassSparkleLine, IconPictureLine, IconSlider2HorizontalLine } from "@karrotmarket/react-monochrome-icon";
import { ChevronLeft, Download, Eraser, PaintBucket, Pencil, RotateCcw, RotateCw, Share2, Trash2 } from "lucide-react";
import { HexColorPicker } from "react-colorful";
import { useAppFeedback } from "./AppFeedback";

const palette = [
  { name: "검정", hex: "#242424" }, { name: "흰색", hex: "#ffffff" }, { name: "회색", hex: "#8b8b8b" },
  { name: "갈색", hex: "#8a5a35" }, { name: "치즈", hex: "#e89b32" }, { name: "크림", hex: "#ead8b5" },
];
const brushTypes = [
  { id: "pencil", label: "연필", description: "선명하고 가는 선" },
  { id: "colored-pencil", label: "색연필", description: "부드럽게 겹치는 선" },
  { id: "pastel", label: "파스텔", description: "옅고 포근한 표현" },
] as const;

function normalizeHex(value: string) {
  const normalized = value.trim().replace(/^#/, "");
  if (/^[0-9a-fA-F]{3}$/.test(normalized)) return `#${normalized.split("").map((character) => character + character).join("").toUpperCase()}`;
  if (/^[0-9a-fA-F]{6}$/.test(normalized)) return `#${normalized.toUpperCase()}`;
  return null;
}

function hexToRgb(value: string) {
  const normalized = normalizeHex(value);
  if (!normalized) return null;
  return { r: Number.parseInt(normalized.slice(1, 3), 16), g: Number.parseInt(normalized.slice(3, 5), 16), b: Number.parseInt(normalized.slice(5, 7), 16) };
}

function colorDistance(first: number[], second: number[]) {
  return first.reduce((total, value, index) => total + Math.abs(value - (second[index] || 0)), 0);
}

type Mode = "draw" | "photo" | "conditions";

export function Finder({ animals, modeOnly, initialTags = "" }: { animals: Animal[]; modeOnly?: Mode; initialTags?: string }) {
  const feedback = useAppFeedback();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const imageRef = useRef<HTMLImageElement>(null);
  const drawing = useRef(false);
  const strokePoints = useRef<[number, number, number][]>([]);
  const strokeBaseImage = useRef<ImageData | null>(null);
  const undoStack = useRef<ImageData[]>([]);
  const redoStack = useRef<ImageData[]>([]);
  const animalsLoadPromise = useRef<Promise<Animal[]> | null>(null);
  const mode = modeOnly || "draw";
  const [brushColor, setBrushColor] = useState(palette[0]);
  const [colorInput, setColorInput] = useState(palette[0].hex);
  const [brushSize, setBrushSize] = useState(5);
  const [eraserSize, setEraserSize] = useState(5);
  const [brushType, setBrushType] = useState<(typeof brushTypes)[number]["id"]>("pencil");
  const [thinning, setThinning] = useState(0.35);
  const [smoothing, setSmoothing] = useState(0.65);
  const [streamline, setStreamline] = useState(0.45);
  const [simulatePressure, setSimulatePressure] = useState(true);
  const [taperStart, setTaperStart] = useState(0);
  const [capStart, setCapStart] = useState(true);
  const [taperEnd, setTaperEnd] = useState(0);
  const [capEnd, setCapEnd] = useState(true);
  const [strokeWidth, setStrokeWidth] = useState(0);
  const [easing, setEasing] = useState("Linear");
  const [settingsOpen, setSettingsOpen] = useState(true);
  const [isErasing, setIsErasing] = useState(false);
  const [isFilling, setIsFilling] = useState(false);
  const [toolSheet, setToolSheet] = useState<"brush" | "eraser" | "fill" | "color" | "save" | null>(null);
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
  const [availableAnimals, setAvailableAnimals] = useState(animals);
  const [ranked, setRanked] = useState(animals);
  const [analysis, setAnalysis] = useState<VisualAnalysis | null>(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [saveState, setSaveState] = useState("");

  const breeds = useMemo(() => ["상관 없음", ...Array.from(new Set(availableAnimals.map((animal) => animal.breed))).slice(0, 30)], [availableAnimals]);
  const regions = useMemo(() => ["전국", ...Array.from(new Set(availableAnimals.map((animal) => animal.region.split(" ")[0]))).filter(Boolean)], [availableAnimals]);

  function chooseColor(value: string) {
    const hex = normalizeHex(value);
    if (!hex) return;
    setBrushColor({ name: "사용자 색상", hex });
    setColorInput(hex);
    setIsErasing(false);
  }

  useEffect(() => {
    if (animals.length || (mode !== "draw" && mode !== "photo")) return;
    let cancelled = false;
    const load = async () => {
      try {
        const response = await fetch("/api/animals?limit=30", { cache: "force-cache" });
        if (!response.ok) return;
        const payload = await response.json() as { items?: Animal[] };
        const next = Array.isArray(payload.items) ? payload.items : [];
        if (!cancelled && next.length) {
          setAvailableAnimals(next);
          setRanked(next);
        }
      } catch {
        // The drawing canvas remains usable even when the optional result data is unavailable.
      }
    };
    const schedule = "requestIdleCallback" in window
      ? window.requestIdleCallback(load, { timeout: 800 })
      : window.setTimeout(load, 0);
    return () => {
      cancelled = true;
      if (typeof schedule === "number") window.clearTimeout(schedule);
      else window.cancelIdleCallback?.(schedule);
    };
  }, [animals, mode]);

  function ensureAnimals() {
    if (availableAnimals.length) return Promise.resolve(availableAnimals);
    if (!animalsLoadPromise.current) {
      animalsLoadPromise.current = fetch("/api/animals?limit=30", { cache: "force-cache" })
        .then(async (response) => {
          if (!response.ok) return [];
          const payload = await response.json() as { items?: Animal[] };
          return Array.isArray(payload.items) ? payload.items : [];
        })
        .catch(() => []);
    }
    return animalsLoadPromise.current;
  }

  useEffect(() => {
    const canvas = canvasRef.current;
    const container = canvas?.parentElement;
    if (!canvas || !container) return;
    let frame = 0;
    const resize = () => {
      if (frame) return;
      frame = window.requestAnimationFrame(() => {
        frame = 0;
        const ratio = window.devicePixelRatio || 1;
        const rect = canvas.getBoundingClientRect();
        const width = Math.max(1, Math.round(rect.width));
        const height = Math.max(1, Math.round(rect.height));
        const pixelWidth = Math.round(width * ratio);
        const pixelHeight = Math.round(height * ratio);
        if (canvas.width === pixelWidth && canvas.height === pixelHeight) return;
        canvas.width = pixelWidth;
        canvas.height = pixelHeight;
        const context = canvas.getContext("2d");
        if (!context) return;
        context.setTransform(ratio, 0, 0, ratio, 0, 0);
        context.fillStyle = "#ffffff";
        context.fillRect(0, 0, width, height);
        context.lineCap = "round";
        context.lineJoin = "round";
      });
    };
    resize();
    const observer = new ResizeObserver(resize);
    observer.observe(container);
    return () => { observer.disconnect(); if (frame) window.cancelAnimationFrame(frame); };
  }, []);

  function point(event: React.PointerEvent<HTMLCanvasElement>): [number, number, number] { const canvas = event.currentTarget; const rect = canvas.getBoundingClientRect(); const ratio = window.devicePixelRatio || 1; const logicalWidth = canvas.width / ratio; const logicalHeight = canvas.height / ratio; return [(event.clientX - rect.left) * (logicalWidth / rect.width), (event.clientY - rect.top) * (logicalHeight / rect.height), event.pressure || 0.5]; }
  function drawBrushTexture(context: CanvasRenderingContext2D, points: [number, number, number][], outline: [number, number][]) {
    if (isErasing || !points.length) return;
    context.save();
    context.beginPath();
    context.moveTo(outline[0][0], outline[0][1]);
    for (const [x, y] of outline.slice(1)) context.lineTo(x, y);
    context.closePath();
    context.clip();
    context.strokeStyle = brushColor.hex;
    context.fillStyle = brushColor.hex;
    context.globalCompositeOperation = "multiply";
    if (brushType === "pencil") {
      context.globalAlpha = 0.24;
      context.lineWidth = Math.max(0.55, brushSize * 0.16);
      context.setLineDash([1.2, 2.6]);
      for (const offset of [-0.7, 0.7]) {
        context.beginPath();
        points.forEach(([x, y], index) => index === 0 ? context.moveTo(x + offset, y - offset) : context.lineTo(x + offset, y - offset));
        context.stroke();
      }
    } else if (brushType === "colored-pencil") {
      context.globalAlpha = 0.17;
      context.lineWidth = Math.max(0.8, brushSize * 0.28);
      context.setLineDash([2.2, 1.4]);
      for (let pass = 0; pass < 3; pass += 1) {
        context.beginPath();
        points.forEach(([x, y], index) => {
          const jitter = Math.sin(index * 7.31 + pass * 2.17) * Math.max(0.6, brushSize * 0.16);
          if (index === 0) context.moveTo(x + jitter, y - jitter);
          else context.lineTo(x + jitter, y - jitter);
        });
        context.stroke();
      }
    } else {
      context.globalAlpha = 0.12;
      const radius = Math.max(0.8, brushSize * 0.24);
      points.forEach(([x, y], index) => {
        for (let particle = 0; particle < 4; particle += 1) {
          const angle = index * 2.41 + particle * 1.57;
          const distance = (Math.sin(index * 3.17 + particle) + 1) * brushSize * 0.42;
          context.beginPath();
          context.arc(x + Math.cos(angle) * distance, y + Math.sin(angle) * distance, radius, 0, Math.PI * 2);
          context.fill();
        }
      });
    }
    context.restore();
  }
  function drawSmoothStroke(context: CanvasRenderingContext2D, points: [number, number, number][]) {
    if (!points.length) return;
    const outline = getStroke(points, { size: isErasing ? eraserSize : brushSize, thinning, smoothing, streamline, simulatePressure, easing: easing === "Linear" ? undefined : (value: number) => value * value, last: true, start: { cap: capStart, taper: taperStart || false }, end: { cap: capEnd, taper: taperEnd || false } });
    context.beginPath();
    context.moveTo(outline[0][0], outline[0][1]);
    for (const [x, y] of outline.slice(1)) context.lineTo(x, y);
    context.closePath();
    context.save();
    context.globalAlpha = isErasing ? 1 : brushType === "pastel" ? 0.28 : brushType === "colored-pencil" ? 0.72 : 1;
    context.fillStyle = isErasing ? "#ffffff" : brushColor.hex;
    context.fill();
    if (strokeWidth > 0) { context.lineWidth = strokeWidth; context.strokeStyle = isErasing ? "#ffffff" : brushColor.hex; context.stroke(); }
    drawBrushTexture(context, points, outline);
    context.restore();
  }
  function fillArea(event: React.PointerEvent<HTMLCanvasElement>) {
    const canvas = event.currentTarget;
    const context = canvas.getContext("2d");
    if (!context) return;
    const rect = canvas.getBoundingClientRect();
    const x = Math.max(0, Math.min(canvas.width - 1, Math.floor((event.clientX - rect.left) * canvas.width / rect.width)));
    const y = Math.max(0, Math.min(canvas.height - 1, Math.floor((event.clientY - rect.top) * canvas.height / rect.height)));
    const image = context.getImageData(0, 0, canvas.width, canvas.height);
    const data = image.data;
    const start = (y * canvas.width + x) * 4;
    const target = [data[start], data[start + 1], data[start + 2], data[start + 3]];
    const fill = hexToRgb(brushColor.hex);
    if (!fill || colorDistance(target, [fill.r, fill.g, fill.b, 255]) < 8) return;
    const matchesTarget = (index: number) => Math.abs(data[index] - target[0]) + Math.abs(data[index + 1] - target[1]) + Math.abs(data[index + 2] - target[2]) + Math.abs(data[index + 3] - target[3]) <= 42;
    const visited = new Uint8Array(canvas.width * canvas.height);
    const stack: [number, number][] = [[x, y]];
    while (stack.length) {
      const [pixelX, pixelY] = stack.pop()!;
      if (pixelX < 0 || pixelX >= canvas.width || pixelY < 0 || pixelY >= canvas.height) continue;
      const pixel = pixelY * canvas.width + pixelX;
      if (visited[pixel]) continue;
      visited[pixel] = 1;
      const index = pixel * 4;
      if (!matchesTarget(index)) continue;
      data[index] = fill.r; data[index + 1] = fill.g; data[index + 2] = fill.b; data[index + 3] = 255;
      stack.push([pixelX - 1, pixelY], [pixelX + 1, pixelY], [pixelX, pixelY - 1], [pixelX, pixelY + 1]);
    }
    undoStack.current.push(image);
    if (undoStack.current.length > 12) undoStack.current.shift();
    redoStack.current = [];
    context.putImageData(image, 0, 0);
    setMatched(false);
    setAnalysis(null);
  }
  function start(event: React.PointerEvent<HTMLCanvasElement>) { const canvas = event.currentTarget, context = canvas.getContext("2d"); if (!context) return; if (isFilling) { fillArea(event); return; } strokeBaseImage.current = context.getImageData(0, 0, canvas.width, canvas.height); undoStack.current.push(strokeBaseImage.current); redoStack.current = []; if (undoStack.current.length > 12) undoStack.current.shift(); drawing.current = true; strokePoints.current = [point(event)]; canvas.setPointerCapture(event.pointerId); drawSmoothStroke(context, strokePoints.current); }
  function move(event: React.PointerEvent<HTMLCanvasElement>) { if (!drawing.current) return; const context = event.currentTarget.getContext("2d"); if (!context || !strokeBaseImage.current) return; strokePoints.current.push(point(event)); context.putImageData(strokeBaseImage.current, 0, 0); drawSmoothStroke(context, strokePoints.current); }
  function finish(event: React.PointerEvent<HTMLCanvasElement>) { drawing.current = false; strokePoints.current = []; strokeBaseImage.current = null; if (event.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId); }
  function clear() { const canvas = canvasRef.current, context = canvas?.getContext("2d"); if (!canvas || !context) return; undoStack.current.push(context.getImageData(0, 0, canvas.width, canvas.height)); redoStack.current = []; context.save(); context.setTransform(1, 0, 0, 1, 0, 0); context.fillStyle = "#fff"; context.fillRect(0, 0, canvas.width, canvas.height); context.restore(); setMatched(false); setAnalysis(null); }
  function undo() { const canvas = canvasRef.current, context = canvas?.getContext("2d"), previous = undoStack.current.pop(); if (canvas && context && previous) { redoStack.current.push(context.getImageData(0, 0, canvas.width, canvas.height)); context.putImageData(previous, 0, 0); } }
  function redo() { const canvas = canvasRef.current, context = canvas?.getContext("2d"), next = redoStack.current.pop(); if (canvas && context && next) { undoStack.current.push(context.getImageData(0, 0, canvas.width, canvas.height)); context.putImageData(next, 0, 0); } }
  function saveDrawing(format: "png" | "jpeg" | "webp" = "png") { const canvas = canvasRef.current; if (!canvas) return; const mime = format === "jpeg" ? "image/jpeg" : format === "webp" ? "image/webp" : "image/png"; const link = document.createElement("a"); link.download = `퍼스트프렌드-그림-${new Date().toISOString().slice(0, 10)}.${format === "jpeg" ? "jpg" : format}`; link.href = canvas.toDataURL(mime, 0.92); link.click(); setToolSheet(null); }
  async function shareDrawing() { const canvas = canvasRef.current; if (!canvas) return; if (!navigator.share) { feedback.error("이 기기에서는 공유 기능을 지원하지 않아요."); return; } const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/png")); if (!blob) return; const file = new File([blob], "퍼스트프렌드-그림.png", { type: "image/png" }); try { await navigator.share({ title: "퍼스트프렌드 그림", text: "퍼스트프렌드에서 그린 친구 그림이에요.", files: [file] }); } catch (error) { if ((error as DOMException).name !== "AbortError") feedback.error("그림을 공유하지 못했어요."); } }
  function upload(event: React.ChangeEvent<HTMLInputElement>) { const file = event.target.files?.[0]; if (!file) return; if (preview) URL.revokeObjectURL(preview); setUploaded(file.name); setPreview(URL.createObjectURL(file)); setMatched(false); setAnalysis(null); }
  function uploadDrawing(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file || !canvasRef.current) return;
    const url = URL.createObjectURL(file);
    const image = new Image();
    image.onload = () => {
      const canvas = canvasRef.current;
      const context = canvas?.getContext("2d");
      if (!canvas || !context) { URL.revokeObjectURL(url); return; }
      const ratio = window.devicePixelRatio || 1;
      const width = canvas.clientWidth || canvas.width / ratio;
      const height = canvas.clientHeight || canvas.height / ratio;
      const scale = Math.min(width / image.naturalWidth, height / image.naturalHeight);
      const drawWidth = image.naturalWidth * scale;
      const drawHeight = image.naturalHeight * scale;
      undoStack.current = [];
      redoStack.current = [];
      context.save();
      context.setTransform(ratio, 0, 0, ratio, 0, 0);
      context.fillStyle = "#ffffff";
      context.fillRect(0, 0, width, height);
      context.drawImage(image, (width - drawWidth) / 2, (height - drawHeight) / 2, drawWidth, drawHeight);
      context.restore();
      setUploaded(file.name);
      setMatched(false);
      setAnalysis(null);
      URL.revokeObjectURL(url);
    };
    image.src = url;
    event.currentTarget.value = "";
  }

  function score(animal: Animal, visual = analysis, source = availableAnimals) {
    let value = 0;
    const haystack = `${animal.name} ${animal.breed} ${animal.species} ${animal.ageGroup} ${animal.sex} ${animal.region} ${animal.colors.join(" ")} ${animal.traits.join(" ")}`.toLowerCase();
    if (species !== "전체") value += animal.species.includes(species) ? 30 : -50;
    if (breed !== "상관 없음") value += haystack.includes(breed.toLowerCase()) ? 22 : -4;
    const wantedCoat = coat !== "상관 없음" ? coat : "";
    if (wantedCoat) value += haystack.includes(wantedCoat.toLowerCase()) ? 18 : 0;
    if (age !== "상관 없음") value += animal.ageGroup === age ? 12 : -2;
    if (gender !== "상관 없음") value += animal.sex.includes(gender) ? 8 : 0;
    if (region !== "전국") value += animal.region.startsWith(region) ? 12 : 0;
    if (query && haystack.includes(query.toLowerCase())) value += 15;
    if (visual) {
      const animalTags = animalVisualTags(animal);
      if (visual.species !== "전체") value += animal.species.includes(visual.species) ? 38 : -55;
      if (visual.source === "photo") {
        for (const color of visual.colors) if (animal.colors.some((item) => item.includes(color) || color.includes(item))) value += 10;
        for (const hint of visual.breedHints) if (animal.breed.includes(hint) || hint.includes(animal.breed)) value += 16;
        for (const tag of [visual.size, visual.eyes, visual.fur, visual.pattern]) if (animalTags.includes(tag)) value += 6;
      }
    }
    value += Math.max(0, 6 - source.indexOf(animal) * 0.1);
    return value;
  }

  async function match() {
    setAnalyzing(true); setSaveState(""); let visual: VisualAnalysis | null = null;
    try {
      const sourceAnimals = await ensureAnimals();
      if (!sourceAnimals.length) throw new Error("동물 정보를 불러오지 못했어요.");
      if (mode === "draw" && canvasRef.current) visual = await analyzeVisual(canvasRef.current, true);
      if (mode === "photo" && imageRef.current) visual = await analyzeVisual(imageRef.current, false);
      if (visual) { setAnalysis(visual); if (species === "전체" && visual.species !== "전체") setSpecies(visual.species); if (visual.colors[0]) setCoat(visual.colors[0]); }
      const result = [...sourceAnimals].sort((a, b) => score(b, visual, sourceAnimals) - score(a, visual, sourceAnimals)); setAvailableAnimals(sourceAnimals); setRanked(result); setMatched(true); document.getElementById("match-results")?.scrollIntoView({ behavior: "smooth", block: "start" });
    } catch {
      feedback.error("그림을 분석하지 못했어요. 잠시 후 다시 시도해 주세요.");
    } finally { setAnalyzing(false); }
  }
  async function saveSearch() { const response = await fetch("/api/saved-searches", { method:"POST", headers:{"content-type":"application/json"}, body:JSON.stringify({ name:analysis ? analysis.tags.slice(0,3).join(" · ") : `${species} ${region}`, criteria:{species,breed,coat,age,gender,region,query,tags:analysis?.tags||[]} }) }); if(response.status===401){setSaveState("로그인하면 이 조건과 신규 등록 알림을 저장할 수 있어요.");return;} if(response.ok){setSaveState("");feedback.success("검색 조건과 새 친구 알림을 저장했어요",{actionLabel:"알림관리",onAction:()=>{location.href="/mypage/searches"}})}else feedback.error("검색 조건을 저장하지 못했어요"); }

  const visible = (matched ? ranked : availableAnimals).filter((animal) => !query || `${animal.name} ${animal.region} ${animal.traits.join(" ")}`.toLowerCase().includes(query.toLowerCase()));

  return <div className={mode === "draw" ? "ff-drawing-workspace" : undefined}>
    {mode === "draw" && <><div className="ff-drawing-topbar ff-modern-drawing-topbar"><a href="/find" aria-label="그림 찾기 닫기"><ChevronLeft size={28} strokeWidth={2} aria-hidden="true" /></a><div className="ff-drawing-toolbar" aria-label="그림 도구"><button type="button" className="ff-toolbar-tool" data-active={toolSheet === "brush" && !isFilling} aria-label="브러시 크기 선택" onClick={() => { setIsFilling(false); setIsErasing(false); setToolSheet("brush"); }}><Pencil size={24} strokeWidth={2.1} /><span className="ff-tool-preview">{brushSize}pt</span></button><button type="button" className="ff-toolbar-tool" data-active={toolSheet === "eraser" || (isErasing && !isFilling)} aria-label="지우개 크기 선택" onClick={() => { setIsFilling(false); setIsErasing(true); setToolSheet("eraser"); }}><Eraser size={24} strokeWidth={2.1} /><span className="ff-tool-preview ff-tool-preview-eraser">{eraserSize}pt</span></button><button type="button" className="ff-toolbar-tool" data-active={isFilling} aria-label="페인트 도구" onClick={() => { setIsFilling(true); setIsErasing(false); setToolSheet("fill"); }}><PaintBucket size={24} strokeWidth={2.1} /></button></div></div><BottomSheetRoot open={toolSheet !== null} onOpenChange={(open) => { if (!open) setToolSheet(null); }}><BottomSheetContent title={toolSheet === "brush" ? "브러시" : toolSheet === "eraser" ? "지우개 크기" : toolSheet === "fill" ? "페인트" : toolSheet === "color" ? "색상" : "그림 저장"} showHandle className={`ff-drawing-tool-sheet ff-drawing-tool-sheet-${toolSheet || "none"}`}><BottomSheetBody>{(toolSheet === "brush" || toolSheet === "eraser") && (() => { const eraser = toolSheet === "eraser"; const value = eraser ? eraserSize : brushSize; return <div className="ff-drawing-size-slider">{!eraser && <div className="ff-drawing-brush-types" role="group" aria-label="브러시 종류">{brushTypes.map((type) => <button type="button" key={type.id} data-active={brushType === type.id} onClick={() => setBrushType(type.id)}><span>{type.label}</span><small>{type.description}</small></button>)}</div>}{!eraser && <div className="ff-drawing-inline-colors" role="group" aria-label="색상 선택">{palette.map((color) => <button type="button" key={color.name} data-active={brushColor.hex === color.hex} style={{ background: color.hex }} aria-label={color.name + " 색상"} onClick={() => chooseColor(color.hex)} />)}</div>}<div className="ff-drawing-size-slider-heading"><span>{eraser ? "지우개 크기" : "브러시 크기"}</span><strong>{value}pt</strong></div><input aria-label={eraser ? "지우개 크기" : "브러시 크기"} type="range" min="1" max="10" step="1" value={value} style={{ "--brush-thumb-size": (10 + value * 1.4) + "px" } as React.CSSProperties} onChange={(event) => { const next = Number(event.target.value); if (eraser) { setEraserSize(next); setIsErasing(true); } else { setBrushSize(next); setIsErasing(false); } }} /><div className="ff-drawing-size-slider-labels"><span>1pt</span><span>5pt</span><span>10pt</span></div></div>; })()}{toolSheet === "fill" && <div className="ff-drawing-color-picker-panel"><p className="ff-drawing-tool-help">채울 색상을 선택하세요.</p><HexColorPicker color={brushColor.hex} onChange={chooseColor} /><label className="ff-drawing-hex-field"><span>HEX</span><input value={colorInput} maxLength={7} spellCheck={false} aria-label="HEX 색상값" onChange={(event) => setColorInput(event.target.value)} onBlur={(event) => chooseColor(event.currentTarget.value)} onKeyDown={(event) => { if (event.key === "Enter") chooseColor(event.currentTarget.value); }} /></label><div className="ff-drawing-color-presets" role="group" aria-label="추천 색상">{palette.map((color) => <button type="button" key={color.name} data-active={brushColor.hex === color.hex} style={{ background: color.hex }} aria-label={color.name + " 색상"} onClick={() => chooseColor(color.hex)} />)}</div></div>}{toolSheet === "color" && <div className="ff-drawing-color-picker-panel"><HexColorPicker color={brushColor.hex} onChange={chooseColor} /><label className="ff-drawing-hex-field"><span>HEX</span><input value={colorInput} maxLength={7} spellCheck={false} aria-label="HEX 색상값" onChange={(event) => setColorInput(event.target.value)} onBlur={(event) => chooseColor(event.currentTarget.value)} onKeyDown={(event) => { if (event.key === "Enter") chooseColor(event.currentTarget.value); }} /></label><div className="ff-drawing-color-presets" role="group" aria-label="추천 색상">{palette.map((color) => <button type="button" key={color.name} data-active={!isErasing && brushColor.hex === color.hex} style={{ background: color.hex }} aria-label={color.name + " 색상"} onClick={() => chooseColor(color.hex)} />)}</div></div>}{toolSheet === "save" && <div className="ff-drawing-save-options" role="menu"><button type="button" onClick={() => saveDrawing("png")}>PNG 이미지</button><button type="button" onClick={() => saveDrawing("jpeg")}>JPG 이미지</button><button type="button" onClick={() => saveDrawing("webp")}>WEBP 이미지</button></div>}</BottomSheetBody></BottomSheetContent></BottomSheetRoot></>}
    {mode === "draw" && <div className="ff-drawing-quick-actions" aria-label="그림 편집 메뉴"><button type="button" aria-label="되돌리기" onClick={undo}><RotateCcw size={24} strokeWidth={2.1} /></button><button type="button" aria-label="다시 되돌리기" onClick={redo}><RotateCw size={24} strokeWidth={2.1} /></button><button type="button" aria-label="전체 지우기" onClick={clear}><Trash2 size={24} strokeWidth={2.1} /></button></div>}
    {mode === "draw" &&
        <section className="ff-canvas-panel">
          <h2 className="ff-section-title">마음속 친구를 그려보세요</h2>
          <p className="ff-description">사진을 올리거나, 그림을 그리면 AI가 마음속 친구를 찾아줘요.</p>
          <div className="ff-freehand-demo-tools">
            <button type="button" className="ff-demo-menu-button" aria-expanded={settingsOpen} aria-label="그림 도구 설정 열기" onClick={() => setSettingsOpen((value) => !value)}><PrefixIcon svg={<IconSlider2HorizontalLine/>}/><span>그림 도구</span><small>{settingsOpen ? "접기" : "펼치기"}</small></button>
            {settingsOpen && <div className="ff-freehand-demo-panel" aria-label="perfect-freehand 그림 설정">
              <div className="ff-demo-range-row"><label htmlFor="draw-size">선 굵기</label><input id="draw-size" type="range" min="1" max="40" step="1" value={brushSize} onChange={(event) => setBrushSize(Number(event.target.value))}/><output>{brushSize}</output></div>
              <div className="ff-demo-range-row"><label htmlFor="draw-thinning">압력 변화</label><input id="draw-thinning" type="range" min="-1" max="1" step="0.05" value={thinning} onChange={(event) => setThinning(Number(event.target.value))}/><output>{thinning}</output></div>
              <div className="ff-demo-range-row"><label htmlFor="draw-streamline">선 따라가기</label><input id="draw-streamline" type="range" min="0" max="1" step="0.05" value={streamline} onChange={(event) => setStreamline(Number(event.target.value))}/><output>{streamline}</output></div>
              <div className="ff-demo-range-row"><label htmlFor="draw-smoothing">선 다듬기</label><input id="draw-smoothing" type="range" min="0" max="1" step="0.05" value={smoothing} onChange={(event) => setSmoothing(Number(event.target.value))}/><output>{smoothing}</output></div>
              <div className="ff-demo-range-row"><label htmlFor="draw-easing">끝맺음</label><select id="draw-easing" value={easing} onChange={(event) => setEasing(event.target.value)}><option>Linear</option><option>Ease in</option></select><output>{easing === "Linear" ? "기본" : "부드럽게"}</output></div>
              <label className="ff-demo-check"><span>속도에 따라 굵기 바꾸기</span><input type="checkbox" checked={simulatePressure} onChange={(event) => setSimulatePressure(event.target.checked)}/></label>
              <hr />
              <div className="ff-demo-range-row"><label htmlFor="draw-taper-start">시작 가늘기</label><input id="draw-taper-start" type="range" min="0" max="1" step="0.05" value={taperStart} onChange={(event) => setTaperStart(Number(event.target.value))}/><output>{taperStart}</output></div>
              <label className="ff-demo-check"><span>시작 부분 둥글게</span><input type="checkbox" checked={capStart} onChange={(event) => setCapStart(event.target.checked)}/></label>
              <hr />
              <div className="ff-demo-range-row"><label htmlFor="draw-taper-end">끝 가늘기</label><input id="draw-taper-end" type="range" min="0" max="1" step="0.05" value={taperEnd} onChange={(event) => setTaperEnd(Number(event.target.value))}/><output>{taperEnd}</output></div>
              <label className="ff-demo-check"><span>끝 부분 둥글게</span><input type="checkbox" checked={capEnd} onChange={(event) => setCapEnd(event.target.checked)}/></label>
              <hr />
              <div className="ff-demo-range-row"><label htmlFor="draw-stroke">외곽선</label><input id="draw-stroke" type="range" min="0" max="8" step="1" value={strokeWidth} onChange={(event) => setStrokeWidth(Number(event.target.value))}/><output>{strokeWidth}</output></div>
              <div className="ff-demo-panel-actions"><button type="button" onClick={() => { setBrushSize(1); setThinning(0.35); setStreamline(0.45); setSmoothing(0.65); setSimulatePressure(true); setEasing("Linear"); setTaperStart(0); setCapStart(true); setTaperEnd(0); setCapEnd(true); setStrokeWidth(0); }}>기본값으로</button><button type="button" onClick={() => navigator.clipboard?.writeText(JSON.stringify({ size: brushSize, thinning, streamline, smoothing, simulatePressure, easing, taperStart, capStart, taperEnd, capEnd, strokeWidth }))}>설정 복사</button><button type="button" onClick={() => navigator.clipboard?.writeText(canvasRef.current?.toDataURL("image/svg+xml") || "")}>SVG로 복사</button></div>
            </div>}
          </div>
          <div className="ff-drawing-canvas-wrap"><canvas ref={canvasRef} className="ff-canvas" aria-label="친구를 그리는 캔버스" onPointerDown={start} onPointerMove={move} onPointerUp={finish} onPointerCancel={finish}/></div>
        </section>
    }
    {mode === "photo" &&
        <section className="ff-canvas-panel"><h2 className="ff-section-title">그림이나 참고 사진을 올려주세요</h2><p className="ff-description" style={{ margin: "5px 0 14px" }}>이미지는 기기 안에서 분석하며 서버에 저장하지 않아요. JPG, PNG, WEBP를 사용할 수 있어요.</p><label className="ff-photo-drop" htmlFor="finder-photo"><IconPictureLine/>{preview ? <img ref={imageRef} src={preview} alt="업로드한 참고 이미지 미리보기"/> : <span>사진 또는 저장한 그림 선택</span>}<input id="finder-photo" type="file" accept="image/jpeg,image/png,image/webp" onChange={upload}/></label>{uploaded && <p className="ff-meta" style={{ marginTop: 8 }}>선택한 파일: {uploaded}</p>}</section>
    }
    {mode === "conditions" &&
        <section className="ff-canvas-panel"><h2 className="ff-section-title">원하는 모습을 골라주세요</h2><p className="ff-description" style={{ margin: "5px 0 16px" }}>한 가지만 골라도 되고, 나이는 상관없음으로 둘 수 있어요.</p><div className="ff-condition-grid"><div className="ff-field"><label htmlFor="breed">품종</label><select id="breed" className="ff-native-select" value={breed} onChange={(event) => setBreed(event.target.value)}>{breeds.map((item) => <option key={item}>{item}</option>)}</select></div><div className="ff-field"><label htmlFor="coat">털색·무늬</label><select id="coat" className="ff-native-select" value={coat} onChange={(event) => setCoat(event.target.value)}><option>상관 없음</option>{palette.map((item) => <option key={item.name}>{item.name}</option>)}<option>줄무늬</option><option>삼색</option></select></div><div className="ff-field"><label htmlFor="age">나이</label><select id="age" className="ff-native-select" value={age} onChange={(event) => setAge(event.target.value)}><option>상관 없음</option><option>어린 친구</option><option>어른 친구</option></select></div><div className="ff-field"><label htmlFor="gender">성별</label><select id="gender" className="ff-native-select" value={gender} onChange={(event) => setGender(event.target.value)}><option>상관 없음</option><option>수컷</option><option>암컷</option></select></div><div className="ff-field"><label htmlFor="region">지역</label><select id="region" className="ff-native-select" value={region} onChange={(event) => setRegion(event.target.value)}>{regions.map((item) => <option key={item}>{item}</option>)}</select></div></div></section>
    }

    {mode === "draw" && <div className="ff-drawing-bottom-actions" aria-label="그림 작업 메뉴"><button type="button" aria-label="그림 저장 형식 선택" onClick={() => setToolSheet("save")}><Download size={22} strokeWidth={2.1} /><span>저장</span></button><button type="button" aria-label="그림 공유" onClick={shareDrawing}><Share2 size={22} strokeWidth={2.1} /><span>공유</span></button><label className="ff-drawing-upload-action" aria-label="그림 업로드"><IconPictureLine width={22} height={22} /><span>그림 업로드</span><input type="file" accept="image/jpeg,image/png,image/webp" aria-label="그림 업로드" onChange={uploadDrawing} /></label><ActionButton variant="brandSolid" size="large" className="ff-drawing-match-action" onClick={match} disabled={analyzing}><PrefixIcon svg={<IconMagnifyingglassSparkleLine/>}/>{analyzing ? "찾는 중…" : "찾기"}</ActionButton></div>}
    {mode !== "draw" && <section className="ff-search-options">
      <div className="ff-kicker">공통 조건</div><div className="ff-chip-row"><Chip.RadioRoot value={species} onValueChange={(value) => setSpecies(value as string)}>{["전체", "고양이", "강아지"].map((item) => <Chip.RadioItem value={item} key={item}><Chip.Label>{item}</Chip.Label></Chip.RadioItem>)}</Chip.RadioRoot></div>
      <div style={{ marginTop: 14 }}><TextField prefixIcon={<IconMagnifyingglassLine/>} aria-label="보호동물 검색"><TextFieldInput value={query} onChange={(event) => setQuery(event.target.value)} placeholder="품종, 지역, 특징 검색"/></TextField></div>
      <ActionButton size="large" className="ff-action-link" style={{ marginTop: 12 }} onClick={match} disabled={analyzing || (mode==="photo"&&!preview)}><PrefixIcon svg={mode === "photo" ? <IconCameraLine/> : <IconMagnifyingglassSparkleLine/>}/>{analyzing ? "그림을 살펴보고 있어요…" : "특징을 분석해 친구 찾기"}</ActionButton>
    </section>}

    {matched && <section className="ff-section" id="match-results">
      <div className="ff-section-head"><h2 className="ff-section-title">{matched ? "닮은 순서로 찾은 친구" : "현재 보호 중인 친구"}</h2><span className="ff-meta">{visible.length}마리</span></div>
      {analysis && <div className="ff-analysis-card"><div className="ff-analysis-head"><div><span>온디바이스 시각 분석</span><strong>그림에서 찾은 검색 태그</strong></div><span className="ff-analysis-badge">{analysis.usedOpenSourceModel ? "기기 안에서 분석" : "특징 분석"}</span></div><div className="ff-tags">{analysis.tags.map(tag=><span className="ff-tag" key={tag}>{tag}</span>)}</div><p>색상·그림이 차지하는 면적·어두운 눈 영역·경계 밀도를 태그로 바꿨어요. 그림은 서버에 저장하지 않고 공개된 보호동물 정보와 비교합니다.</p></div>}
      {matched && visible[0] && <Callout tone="positive" title={`${visible[0].name} 친구가 가장 가까워요`} description={`${visible[0].matchReason} 분석 태그와 공개된 품종·털색·체중 단서를 비교했으며 건강·성격·입양 성공은 추측하지 않았어요.`}/>}
      <div className="ff-animal-grid" style={{ marginTop: 14 }}>{visible.map((animal) => <AnimalCard animal={animal} key={animal.id}/>)}</div>
      {!visible.length && <div className="ff-empty"><strong>조건에 맞는 친구가 아직 없어요.</strong><p>지역이나 나이를 넓히거나, 같은 털색의 다른 품종을 살펴보세요.</p><ActionButton variant="neutralWeak" size="small" onClick={()=>{setRegion("전국");setAge("상관 없음");setQuery("");setRanked(availableAnimals);}}>조건 넓히기</ActionButton></div>}
      {matched && visible[0] && <div className="ff-result-shortcut"><a href={`/friends/${visible[0].id}`}>첫 번째 친구 자세히 보기</a></div>}
      {matched && <div className="ff-save-search"><ActionButton variant="neutralWeak" onClick={saveSearch}>이 조건과 신규 등록 알림 저장</ActionButton>{saveState&&<p className="ff-meta">{saveState}</p>}</div>}
    </section>}
  </div>;
}
