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

const QR_SIZE = 145;
const TONE: Record<Tone, [string, string]> = { positive: [COLOR.positive, COLOR.positiveWeak], informative: [COLOR.informative, COLOR.informativeWeak], neutral: [COLOR.muted, COLOR.neutralWeak] };

/** 카드에 들어갈 사진(서버 압축 썸네일)·붉은 실·워드마크·상세 페이지 QR을 data URL로 받습니다. */
export async function loadCardAssets(animal: Animal, detailUrl: string): Promise<CardAssets> {
  const [photo, string, wordmark, qr] = await Promise.all([
    toDataUrl(animal.thumbnail || animal.image),
    toDataUrl("/worldcup-string-heart.webp"),
    toDataUrl("/logo-wordmark.webp"),
    // 오류정정 L(7%)이면 짧은 주소가 29×29 모듈(버전 3)에 들어갑니다. 카드에 놓는 크기(145px = 29×5px)로 바로 만들어
    // 브라우저가 다시 축소하며 흐려지는 일을 막습니다(축소본은 폰 화면 폭에서 판독이 깨졌음).
    QRCode.toDataURL(detailUrl, { width: QR_SIZE, margin: 0, errorCorrectionLevel: "L", color: { dark: COLOR.ink, light: COLOR.white } }),
  ]);
  return { id: animal.id, photo, string, wordmark, qr, date: cardDate() };
}

export function WorldCupCard({ ref, headline, breed, number, meta, journey, taste, shelter, status, assets }: Props) {
  const [toneFg, toneBg] = TONE[status.tone] ?? TONE.neutral;
  const pillWidth = status.statusLabel.length * 20 + 40;
  // 세로 배분(1350): 흐린 사진 바탕 위 카드 120~1300(QR 아래 여백 44px). 하트 실이 카드 위를 가로지르고, 머리 → 큰 사진(568px) → 이름 → 선택·취향 한 줄 → QR·보호소, 카드 아래 띠에 날짜·출처.
  // 바탕(.wc-backdrop)은 우승 친구 사진을 크게 흐린 뒤 어둡게 덮은 것. 화면에서는 CSS로 숨기고 페이지 배경(같은 사진)이 비치며, 내보낸 PNG에는 그대로 들어갑니다(독립 SVG에는 페이지 CSS가 안 먹음).
  return <svg ref={ref} className="ff-worldcup-card" viewBox={`0 0 ${CARD_WIDTH} ${CARD_HEIGHT}`} role="img" aria-label={`${headline}, ${breed} 인연 카드`} fontFamily={FONT}>
    <defs>
      <clipPath id="wc-photo"><rect x={256} y={386} width={568} height={568} rx={44} /></clipPath>
      <filter id="wc-backdrop-blur" x="-20%" y="-20%" width="140%" height="140%"><feGaussianBlur stdDeviation="38" /></filter>
      <filter id="wc-card-shadow" x="-10%" y="-10%" width="120%" height="120%"><feDropShadow dx="0" dy="16" stdDeviation="20" floodColor="#000000" floodOpacity="0.35" /></filter>
      <linearGradient id="wc-shade" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#101424" stopOpacity="0.55" /><stop offset="0.45" stopColor="#101424" stopOpacity="0.28" /><stop offset="1" stopColor="#101424" stopOpacity="0.62" /></linearGradient>
    </defs>
    <g className="wc-backdrop">
      <rect width={CARD_WIDTH} height={CARD_HEIGHT} fill={COLOR.night} />
      {assets && <image href={assets.photo} x={-120} y={-120} width={CARD_WIDTH + 240} height={CARD_HEIGHT + 240} preserveAspectRatio="xMidYMid slice" filter="url(#wc-backdrop-blur)" />}
      <rect width={CARD_WIDTH} height={CARD_HEIGHT} fill="url(#wc-shade)" />
    </g>
    <rect x={60} y={120} width={960} height={1180} rx={48} fill={COLOR.cream} filter="url(#wc-card-shadow)" />
    {/* 하트 모양 붉은 실(인연)이 카드 위쪽을 가로지르는 모습. 하트는 카드 오른쪽 위에 옵니다. */}
    {assets && <image href={assets.string} x={-70} y={-70} width={1250} height={442} preserveAspectRatio="xMidYMid meet" />}
    {/* 머리: 워드마크 · 카드 번호(공고 번호 끝자리) · 카드 종류 · 헤드라인 */}
    {assets && <image href={assets.wordmark} x={108} y={220} width={240} height={36} preserveAspectRatio="xMinYMid meet" />}
    {number && <text x={972} y={250} textAnchor="end" fontSize={26} fontWeight={600} fill={COLOR.subtle}>No. {number}</text>}
    <rect x={350} y={274} width={380} height={46} rx={23} fill={COLOR.brandWeak} />
    <text x={540} y={305} textAnchor="middle" fontSize={23} fontWeight={700} fill={COLOR.brand}>이상형 월드컵 · 인연 카드</text>
    <text x={540} y={362} textAnchor="middle" fontSize={fitFontSize(headline, 40, 880)} fontWeight={700} fill={COLOR.ink}>{headline}</text>
    {/* 주인공 사진 */}
    <rect x={256} y={386} width={568} height={568} rx={44} fill={COLOR.neutralWeak} />
    {assets && <image href={assets.photo} x={256} y={386} width={568} height={568} preserveAspectRatio="xMidYMid slice" clipPath="url(#wc-photo)" />}
    <rect x={256} y={386} width={568} height={568} rx={44} fill="none" stroke={COLOR.line} strokeWidth={2} />
    <text x={540} y={1014} textAnchor="middle" fontSize={fitFontSize(breed, 54, 820)} fontWeight={800} fill={COLOR.ink}>{breed}</text>
    <text x={540} y={1048} textAnchor="middle" fontSize={25} fontWeight={500} fill={COLOR.muted}>{meta}</text>
    {/* 여정 지표 한 줄: 왼쪽 선택, 오른쪽 취향 */}
    <text x={108} y={1082} fontSize={22} fontWeight={500} fill={COLOR.muted}>선택 <tspan fontWeight={700} fill={COLOR.ink}>{journey}</tspan></text>
    <text x={972} y={1082} textAnchor="end" fontSize={22} fontWeight={500} fill={COLOR.muted}>취향 <tspan fontWeight={700} fill={COLOR.ink} fontSize={fitFontSize(taste, 22, 520)}>{taste}</tspan></text>
    {/* 발: 상세 페이지 QR(145px, 흰 여백 ~8px. 폰 화면 폭에서도 읽히는 크기) · 보호소 · 공고 상태 */}
    <rect x={108} y={1096} width={160} height={160} rx={14} fill={COLOR.white} stroke={COLOR.line} strokeWidth={2} />
    {assets && <image href={assets.qr} x={116} y={1104} width={QR_SIZE} height={QR_SIZE} />}
    <text x={292} y={1140} fontSize={fitFontSize(shelter, 24, 972 - 292 - pillWidth - 24)} fontWeight={700} fill={COLOR.ink}>{shelter}</text>
    <rect x={972 - pillWidth} y={1116} width={pillWidth} height={34} rx={17} fill={toneBg} />
    <text x={972 - pillWidth / 2} y={1140} textAnchor="middle" fontSize={20} fontWeight={700} fill={toneFg}>{status.statusLabel}</text>
    <text x={292} y={1182} fontSize={22} fontWeight={500} fill={COLOR.muted}>지금 보호소에서 기다리고 있어요</text>
    <text x={292} y={1216} fontSize={19} fontWeight={500} fill={COLOR.subtle}>QR을 찍으면 이 친구의 상세 페이지로 바로 가요</text>
    {/* 카드 아래 띠: 날짜 · 출처 */}
    <text x={540} y={1332} textAnchor="middle" fontSize={20} fontWeight={500} fill={COLOR.white} opacity={0.72}>{assets?.date ? `${assets.date} · ` : ""}국가동물보호정보시스템 공고 기준 · firstfriend.me</text>
  </svg>;
}
