"use client";

import QRCode from "qrcode";
import type { Ref } from "react";
import type { Animal } from "../../lib/data";
import { CARD_HEIGHT, CARD_WIDTH, COLOR, FONT, cardDate, fitFontSize, toDataUrl } from "../../lib/card-export";

// 이상형 월드컵 결과의 "인연 카드". 화면에 보이는 이 SVG를 그대로 PNG(1080×1350, 4:5)로 내보내 SNS에 올립니다.
// 색·글꼴·PNG 변환은 lib/card-export.ts(인증서 카드와 공용)에 있고, 여기서는 사진·붉은 실·워드마크·QR을 data URL로 받아 둡니다.
export { exportCardPng } from "../../lib/card-export";
export type CardAssets = { id: string; photo: string; string: string; wordmark: string; qr: string; date: string };
type Props = {
  ref?: Ref<SVGSVGElement>;
  headline: string; breed: string; number: string; meta: string; shelter: string;
  assets: CardAssets | null;
};

const QR_SIZE = 145;

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

export function WorldCupCard({ ref, headline, breed, number, meta, shelter, assets }: Props) {
  // 세로 배분(1350): 흐린 사진 바탕 위 카드 60~1312(QR 아래 여백 38px). 세로 리듬: 실→워드마크 40, 워드마크→배지 22, 배지→헤드라인 18, 헤드라인→사진 22, 사진→이름 56, 이름→메타 34, 메타→QR 30. 하트 실이 화면 왼쪽 벽에서 나와 카드 안쪽 상단을 가로지르고 하트는 카드 상단 테두리 위로 살짝, 꼬리는 카드 오른쪽 테두리를 지나 끝나며, 그 아래 머리 → 큰 사진(648px) → 이름 → QR·보호소, 카드 아래 띠에 날짜·주소.
  // 바탕(.wc-backdrop)은 우승 친구 사진을 크게 흐린 뒤 어둡게 덮은 것. 화면에서는 CSS로 숨기고 페이지 배경(같은 사진)이 비치며, 내보낸 PNG에는 그대로 들어갑니다(독립 SVG에는 페이지 CSS가 안 먹음).
  return <svg ref={ref} className="ff-worldcup-card" viewBox={`0 0 ${CARD_WIDTH} ${CARD_HEIGHT}`} role="img" aria-label={`${headline}, ${breed} 인연 카드`} fontFamily={FONT}>
    <defs>
      <clipPath id="wc-photo"><rect x={239} y={392} width={602} height={602} rx={44} /></clipPath>
      {/* 배경 사진: 얼굴을 알아볼 수 없게 강하게 흐리고 채도를 낮춥니다(화면 CSS와 같은 방향). */}
      <filter id="wc-backdrop-blur" x="-30%" y="-30%" width="160%" height="160%" colorInterpolationFilters="sRGB"><feGaussianBlur stdDeviation="90" /><feColorMatrix type="saturate" values="0.6" /><feComponentTransfer><feFuncR type="linear" slope="0.82" /><feFuncG type="linear" slope="0.82" /><feFuncB type="linear" slope="0.82" /></feComponentTransfer></filter>
      <filter id="wc-card-shadow" x="-10%" y="-10%" width="120%" height="120%"><feDropShadow dx="0" dy="16" stdDeviation="20" floodColor="#000000" floodOpacity="0.35" /></filter>
      {/* 카드 둘레는 웜그레이로 은은히 밝고 가장자리·위아래는 차콜로 어두워지는 넓은 그라데이션 */}
      <radialGradient id="wc-glow" cx="0.5" cy="0.5" r="0.62"><stop offset="0" stopColor="#ded2c4" stopOpacity="0.32" /><stop offset="0.38" stopColor="#ded2c4" stopOpacity="0.13" /><stop offset="0.62" stopColor="#17181c" stopOpacity="0" /><stop offset="1" stopColor="#17181c" stopOpacity="0.58" /></radialGradient>
      <linearGradient id="wc-shade" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#17181c" stopOpacity="0.45" /><stop offset="0.2" stopColor="#17181c" stopOpacity="0.10" /><stop offset="0.72" stopColor="#17181c" stopOpacity="0.10" /><stop offset="1" stopColor="#17181c" stopOpacity="0.62" /></linearGradient>
    </defs>
    <g className="wc-backdrop">
      <rect width={CARD_WIDTH} height={CARD_HEIGHT} fill="#1f2126" />
      {assets && <image href={assets.photo} x={-240} y={-240} width={CARD_WIDTH + 480} height={CARD_HEIGHT + 480} preserveAspectRatio="xMidYMid slice" filter="url(#wc-backdrop-blur)" />}
      <rect width={CARD_WIDTH} height={CARD_HEIGHT} fill="url(#wc-glow)" />
      <rect width={CARD_WIDTH} height={CARD_HEIGHT} fill="url(#wc-shade)" />
    </g>
    <rect x={60} y={60} width={960} height={1252} rx={48} fill={COLOR.cream} filter="url(#wc-card-shadow)" />
    {/* 하트 모양 붉은 실(인연): 화면 왼쪽 벽(x=0, 이미지는 -60부터)에 붙어 나와 카드 왼쪽 테두리를 지나 안쪽 상단을 가로지릅니다. -4° 기울여 왼쪽은 카드 안쪽(테두리 아래 ~60px), 하트 꼭대기는 카드 상단 테두리(40) 위로 ~15px 나가고, 꼬리 끝(x≈1048)은 카드 오른쪽 테두리(1020)를 지나 밖에서 끝납니다. */}
    {assets && <image href={assets.string} x={-60} y={-25} width={1110} height={393} transform="rotate(-4 495 172)" preserveAspectRatio="xMidYMid meet" />}
    {/* 머리: 워드마크 · 카드 번호(공고 번호 끝자리, 실 꼬리가 지나는 오른쪽 위를 피해 워드마크 옆) · 카드 종류 · 헤드라인 */}
    {assets && <image href={assets.wordmark} x={108} y={208} width={240} height={36} preserveAspectRatio="xMinYMid meet" />}
    <rect x={350} y={266} width={380} height={46} rx={23} fill={COLOR.brandWeak} />
    <text x={540} y={297} textAnchor="middle" fontSize={23} fontWeight={700} fill={COLOR.brand}>이상형 월드컵</text>
    <text x={540} y={362} textAnchor="middle" fontSize={fitFontSize(headline, 40, 880)} fontWeight={700} fill={COLOR.ink}>{headline}</text>
    {/* 주인공 사진 */}
    <rect x={239} y={392} width={602} height={602} rx={44} fill={COLOR.neutralWeak} />
    {assets && <image href={assets.photo} x={239} y={392} width={602} height={602} preserveAspectRatio="xMidYMid slice" clipPath="url(#wc-photo)" />}
    <rect x={239} y={392} width={602} height={602} rx={44} fill="none" stroke={COLOR.line} strokeWidth={2} />
    {/* 보호소 동물의 이름 = 공고 번호 끝자리 + 종 (예: 00720 믹스견) */}
    <text x={540} y={1050} textAnchor="middle" fontSize={fitFontSize(number ? `${number} ${breed}` : breed, 54, 820)} fontWeight={800} fill={COLOR.ink}>{number ? `${number} ${breed}` : breed}</text>
    <text x={540} y={1084} textAnchor="middle" fontSize={25} fontWeight={500} fill={COLOR.muted}>{meta}</text>
    {/* 발: 상세 페이지 QR(145px, 흰 여백 ~8px. 폰 화면 폭에서도 읽히는 크기) · 보호소 */}
    <rect x={108} y={1114} width={160} height={160} rx={14} fill={COLOR.white} stroke={COLOR.line} strokeWidth={2} />
    {/* QR 위치 (116, 1122): 5px 모듈이 390·330·300px 폭으로 줄어도 판독되는 서브픽셀 위상(시뮬레이션 10/10). 1~2px만 옮겨도 판독률이 크게 떨어지니 유지. */}
    {assets && <image href={assets.qr} x={116} y={1122} width={QR_SIZE} height={QR_SIZE} />}
    <text x={292} y={1158} fontSize={fitFontSize(shelter, 24, 972 - 292)} fontWeight={700} fill={COLOR.ink}>{shelter}</text>
    <text x={292} y={1200} fontSize={22} fontWeight={500} fill={COLOR.muted}>지금 보호소에서 기다리고 있어요</text>
    <text x={292} y={1234} fontSize={19} fontWeight={500} fill={COLOR.subtle}>QR을 찍으면 이 친구의 상세 페이지로 바로 가요</text>
    {/* 카드 아래 띠: 날짜 · 주소 */}
    <text x={540} y={1338} textAnchor="middle" fontSize={20} fontWeight={500} fill={COLOR.white} opacity={0.72}>{assets?.date ? `${assets.date} · ` : ""}firstfriend.me</text>
  </svg>;
}
