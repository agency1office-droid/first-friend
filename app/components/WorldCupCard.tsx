"use client";

import QRCode from "qrcode";
import type { Ref } from "react";
import type { Animal } from "../../lib/data";
import { CARD_HEIGHT, CARD_WIDTH, COLOR, FONT, cardDate, fitFontSize, toDataUrl } from "../../lib/card-export";

// 이상형 월드컵 결과의 "인연 카드". 화면에 보이는 이 SVG를 그대로 PNG(1080×1350, 4:5)로 내보내 SNS에 올립니다.
// 색·글꼴·PNG 변환은 lib/card-export.ts(인증서 카드와 공용)에 있고, 여기서는 사진·붉은 실·워드마크·QR을 data URL로 받아 둡니다.
export { exportCardPng } from "../../lib/card-export";
export type CardAssets = { id: string; photo: string; string: string; wordmark: string; qr: string; date: string };
type Tone = "positive" | "informative" | "neutral";
type Props = {
  ref?: Ref<SVGSVGElement>;
  headline: string; breed: string; number: string; meta: string; journey: string; taste: string; shelter: string;
  status: { statusLabel: string; tone: Tone };
  assets: CardAssets | null;
};

const TONE: Record<Tone, [string, string]> = { positive: [COLOR.positive, COLOR.positiveWeak], informative: [COLOR.informative, COLOR.informativeWeak], neutral: [COLOR.muted, COLOR.neutralWeak] };

/** 카드에 들어갈 사진(서버 압축 썸네일)·붉은 실·워드마크·상세 페이지 QR을 data URL로 받습니다. */
export async function loadCardAssets(animal: Animal, detailUrl: string): Promise<CardAssets> {
  const [photo, string, wordmark, qr] = await Promise.all([
    toDataUrl(animal.thumbnail || animal.image),
    toDataUrl("/worldcup-string.webp"),
    toDataUrl("/logo-wordmark.webp"),
    QRCode.toDataURL(detailUrl, { width: 240, margin: 0, color: { dark: COLOR.ink, light: COLOR.cream } }),
  ]);
  return { id: animal.id, photo, string, wordmark, qr, date: cardDate() };
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
