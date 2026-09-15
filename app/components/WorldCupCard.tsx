"use client";

import QRCode from "qrcode";
import type { Ref } from "react";
import type { Animal } from "../../lib/data";

// 이상형 월드컵 결과의 "인연 카드". 화면에 보이는 이 SVG를 그대로 PNG(1080×1350, 4:5)로 내보내 SNS에 올립니다.
// 이미지로 변환할 때는 CSS 변수와 외부 URL을 쓸 수 없어, 색은 SEED 라이트 팔레트 값으로 고정하고 사진·로고·QR은 data URL로 받아 둡니다.
export const CARD_WIDTH = 1080;
export const CARD_HEIGHT = 1350;
export type CardAssets = { id: string; photo: string; string: string; wordmark: string; qr: string; date: string };
type Tone = "positive" | "informative" | "neutral";
type Props = {
  ref?: Ref<SVGSVGElement>;
  headline: string; breed: string; number: string; meta: string; journey: string; taste: string; shelter: string;
  status: { statusLabel: string; tone: Tone };
  assets: CardAssets | null;
};

const COLOR = {
  night: "#1c2340", cream: "#fffaf3",
  ink: "#1a1c20", muted: "#555d6d", subtle: "#868b94", // SEED gray-1000 / gray-800 / gray-700
  brand: "#f60", brandWeak: "#fff2ec", // SEED carrot-600 / carrot-100
  positive: "#079171", positiveWeak: "#edfaf6", informative: "#217cf9", informativeWeak: "#eff6ff", neutralWeak: "#f7f8f9", // SEED green·blue 700/100, gray-100
  line: "#00000010", white: "#fff", // SEED static-black-alpha-300 / static-white
};
const FONT = `-apple-system, BlinkMacSystemFont, "Apple SD Gothic Neo", "Pretendard Variable", Pretendard, "Segoe UI", Roboto, "Noto Sans KR", "Malgun Gothic", sans-serif`;
const TONE: Record<Tone, [string, string]> = { positive: [COLOR.positive, COLOR.positiveWeak], informative: [COLOR.informative, COLOR.informativeWeak], neutral: [COLOR.muted, COLOR.neutralWeak] };

// 한글은 글자 폭이 글자 크기와 비슷해, 긴 이름은 글자 크기를 줄여 한 줄에 맞춥니다.
function fitFontSize(text: string, maxSize: number, width: number) {
  return Math.min(maxSize, Math.floor(width / Math.max(text.length, 1)));
}

async function toDataUrl(url: string) {
  const response = await fetch(url, { cache: "force-cache" });
  if (!response.ok) throw new Error(`이미지를 받지 못했어요 (${response.status})`);
  const blob = await response.blob();
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(reader.error ?? new Error("이미지를 읽지 못했어요"));
    reader.readAsDataURL(blob);
  });
}

/** 카드에 들어갈 사진(서버 압축 썸네일)·붉은 실·워드마크·상세 페이지 QR을 data URL로 받습니다. */
export async function loadCardAssets(animal: Animal, detailUrl: string): Promise<CardAssets> {
  const [photo, string, wordmark, qr] = await Promise.all([
    toDataUrl(animal.thumbnail || animal.image),
    toDataUrl("/worldcup-string.webp"),
    toDataUrl("/logo-wordmark.webp"),
    QRCode.toDataURL(detailUrl, { width: 240, margin: 0, color: { dark: COLOR.ink, light: COLOR.cream } }),
  ]);
  const now = new Date();
  const date = `${now.getFullYear()}.${String(now.getMonth() + 1).padStart(2, "0")}.${String(now.getDate()).padStart(2, "0")}`;
  return { id: animal.id, photo, string, wordmark, qr, date };
}

/** 화면의 카드 SVG를 그대로 1080×1350 PNG로 만듭니다. 글꼴은 기기 글꼴이라 화면과 같게 나옵니다. */
export async function exportCardPng(svg: SVGSVGElement) {
  const clone = svg.cloneNode(true) as SVGSVGElement;
  clone.setAttribute("xmlns", "http://www.w3.org/2000/svg");
  clone.setAttribute("width", String(CARD_WIDTH));
  clone.setAttribute("height", String(CARD_HEIGHT));
  clone.removeAttribute("class");
  const url = URL.createObjectURL(new Blob([new XMLSerializer().serializeToString(clone)], { type: "image/svg+xml;charset=utf-8" }));
  try {
    const image = new Image();
    image.src = url;
    await image.decode();
    const canvas = document.createElement("canvas");
    canvas.width = CARD_WIDTH; canvas.height = CARD_HEIGHT;
    const context = canvas.getContext("2d");
    if (!context) throw new Error("캔버스를 쓸 수 없어요");
    context.drawImage(image, 0, 0, CARD_WIDTH, CARD_HEIGHT);
    return await new Promise<Blob>((resolve, reject) => canvas.toBlob(blob => blob ? resolve(blob) : reject(new Error("PNG로 바꾸지 못했어요")), "image/png"));
  } finally {
    URL.revokeObjectURL(url);
  }
}

export function WorldCupCard({ ref, headline, breed, number, meta, journey, taste, shelter, status, assets }: Props) {
  const [toneFg, toneBg] = TONE[status.tone] ?? TONE.neutral;
  const pillWidth = status.statusLabel.length * 20 + 40;
  // 세로 배분(1350): 남색 바탕 위 카드 120~1290. 위쪽 띠(~290)는 붉은 실, 머리 → 사진 → 이름 → 지표 두 줄 → QR·보호소, 카드 아래 띠에 날짜·출처.
  return <svg ref={ref} className="ff-worldcup-card" viewBox={`0 0 ${CARD_WIDTH} ${CARD_HEIGHT}`} role="img" aria-label={`${headline}, ${breed} 인연 카드`} fontFamily={FONT}>
    <defs><clipPath id="wc-photo"><rect x={330} y={486} width={420} height={420} rx={40} /></clipPath></defs>
    <rect width={CARD_WIDTH} height={CARD_HEIGHT} fill={COLOR.night} />
    <rect x={60} y={120} width={960} height={1170} rx={48} fill={COLOR.cream} />
    {/* 붉은 실(인연)이 카드 위쪽을 가로지르며 걸려 있는 모습 */}
    {assets && <image href={assets.string} x={-160} y={-20} width={1400} height={466} preserveAspectRatio="xMidYMid meet" opacity={0.92} />}
    {/* 머리: 워드마크 · 카드 번호(공고 번호 끝자리) · 카드 종류 · 헤드라인 */}
    {assets && <image href={assets.wordmark} x={108} y={300} width={240} height={36} preserveAspectRatio="xMinYMid meet" />}
    {number && <text x={972} y={330} textAnchor="end" fontSize={26} fontWeight={600} fill={COLOR.subtle}>No. {number}</text>}
    <rect x={350} y={362} width={380} height={48} rx={24} fill={COLOR.brandWeak} />
    <text x={540} y={395} textAnchor="middle" fontSize={23} fontWeight={700} fill={COLOR.brand}>이상형 월드컵 · 인연 카드</text>
    <text x={540} y={458} textAnchor="middle" fontSize={fitFontSize(headline, 40, 880)} fontWeight={700} fill={COLOR.ink}>{headline}</text>
    {/* 주인공 사진 */}
    <rect x={330} y={486} width={420} height={420} rx={40} fill={COLOR.neutralWeak} />
    {assets && <image href={assets.photo} x={330} y={486} width={420} height={420} preserveAspectRatio="xMidYMid slice" clipPath="url(#wc-photo)" />}
    <rect x={330} y={486} width={420} height={420} rx={40} fill="none" stroke={COLOR.line} strokeWidth={2} />
    <text x={540} y={972} textAnchor="middle" fontSize={fitFontSize(breed, 54, 820)} fontWeight={800} fill={COLOR.ink}>{breed}</text>
    <text x={540} y={1012} textAnchor="middle" fontSize={25} fontWeight={500} fill={COLOR.muted}>{meta}</text>
    {/* 여정 지표: 선택 · 취향 */}
    <line x1={108} y1={1040} x2={972} y2={1040} stroke={COLOR.line} strokeWidth={2} />
    <text x={108} y={1080} fontSize={25} fontWeight={500} fill={COLOR.muted}>선택</text>
    <text x={972} y={1080} textAnchor="end" fontSize={25} fontWeight={700} fill={COLOR.ink}>{journey}</text>
    <line x1={108} y1={1100} x2={972} y2={1100} stroke={COLOR.line} strokeWidth={2} />
    <text x={108} y={1140} fontSize={25} fontWeight={500} fill={COLOR.muted}>취향</text>
    <text x={972} y={1140} textAnchor="end" fontSize={fitFontSize(taste, 25, 640)} fontWeight={700} fill={COLOR.ink}>{taste}</text>
    <line x1={108} y1={1160} x2={972} y2={1160} stroke={COLOR.line} strokeWidth={2} />
    {/* 발: 상세 페이지 QR · 보호소 · 공고 상태 */}
    <rect x={108} y={1178} width={100} height={100} rx={12} fill={COLOR.white} stroke={COLOR.line} strokeWidth={2} />
    {assets && <image href={assets.qr} x={114} y={1184} width={88} height={88} />}
    <text x={232} y={1210} fontSize={fitFontSize(shelter, 24, 972 - 232 - pillWidth - 24)} fontWeight={700} fill={COLOR.ink}>{shelter}</text>
    <rect x={972 - pillWidth} y={1184} width={pillWidth} height={34} rx={17} fill={toneBg} />
    <text x={972 - pillWidth / 2} y={1208} textAnchor="middle" fontSize={20} fontWeight={700} fill={toneFg}>{status.statusLabel}</text>
    <text x={232} y={1246} fontSize={22} fontWeight={500} fill={COLOR.muted}>지금 보호소에서 기다리고 있어요</text>
    <text x={232} y={1274} fontSize={19} fontWeight={500} fill={COLOR.subtle}>QR을 찍으면 이 친구의 상세 페이지로 바로 가요</text>
    {/* 카드 아래 띠: 날짜 · 출처 */}
    <text x={540} y={1326} textAnchor="middle" fontSize={20} fontWeight={500} fill={COLOR.white} opacity={0.72}>{assets?.date ? `${assets.date} · ` : ""}국가동물보호정보시스템 공고 기준 · firstfriend.me</text>
  </svg>;
}
