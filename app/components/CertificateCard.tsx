"use client";

import { useEffect, useImperativeHandle, useRef, useState, type ReactNode, type Ref } from "react";
import { IconArrowDownHorizlineLine } from "@karrotmarket/react-monochrome-icon";
import { CARD_HEIGHT, CARD_WIDTH, COLOR, FONT, cardDate, exportCardPng, fitFontSize, toDataUrl } from "../../lib/card-export";
import { useAppFeedback } from "./AppFeedback";

// 상식 퀴즈·입양 준비·입양 환경 점검 결과의 인증서 카드. 인연 카드(WorldCupCard)와 같은 방식으로
// 화면의 SVG를 그대로 1080×1350 PNG로 내보내므로, 색은 hex로 고정하고 이미지는 data URL로 받아 둡니다.
export type CertificateRow = { label: string; value: string };
export type CertificateHandle = { share(url: string): Promise<void> };
type Assets = { src: string; illustration: string; wordmark: string };
type CardProps = { ref?: Ref<SVGSVGElement>; badge: string; number: string; date: string; holder: string; rows: CertificateRow[]; assets: Assets | null };
type ResultProps = { ref?: Ref<CertificateHandle>; badge: string; illustration: string; memberName?: string | null; rows: CertificateRow[]; share: { title: string; text: string }; extraAction?: ReactNode };

const HOLDER_FALLBACK = "첫 친구 예비 반려인";
const GRADIENT = ["#fff3ea", "#ffd7b8", "#ffbf8f"]; // SEED carrot-100 → 200 → 300 부근의 밝은 웜 톤

// 발급 번호는 장식용입니다. 저장하지 않으므로 검증에 쓸 수 없고, http LAN에서는 crypto.randomUUID가 없어 Math.random을 씁니다.
function certificateNumber(date: string) {
  return `FF-${date.slice(2).replace(/\./g, "")}-${Math.random().toString(36).slice(2, 6).padEnd(4, "0").toUpperCase()}`;
}

export function CertificateCard({ ref, badge, number, date, holder, rows, assets }: CardProps) {
  const badgeWidth = badge.length * 30 + 56;
  // 세로 배분(1350): 배지·번호(72~132) → 흰 원 위 일러스트(260~680) → 이름(790) → 항목 두 줄(930·1020) → 워드마크(1140) → 발급일(1270)
  return <svg ref={ref} className="ff-certificate-card" viewBox={`0 0 ${CARD_WIDTH} ${CARD_HEIGHT}`} role="img" aria-label={`${holder} ${badge}`} fontFamily={FONT}>
    <defs>
      <linearGradient id="cert-bg" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stopColor={GRADIENT[0]} /><stop offset="0.55" stopColor={GRADIENT[1]} /><stop offset="1" stopColor={GRADIENT[2]} /></linearGradient>
      <clipPath id="cert-clip"><circle cx={540} cy={470} r={190} /></clipPath>
    </defs>
    <rect width={CARD_WIDTH} height={CARD_HEIGHT} fill="url(#cert-bg)" />
    <rect x={72} y={72} width={badgeWidth} height={60} rx={30} fill={COLOR.white} opacity={0.82} />
    <text x={72 + badgeWidth / 2} y={112} textAnchor="middle" fontSize={28} fontWeight={700} fill={COLOR.brand}>{badge}</text>
    <text x={1008} y={112} textAnchor="end" fontSize={28} fontWeight={600} fill={COLOR.muted}>No. {number}</text>
    <circle cx={540} cy={470} r={210} fill={COLOR.white} opacity={0.9} />
    {assets && <image href={assets.illustration} x={350} y={280} width={380} height={380} preserveAspectRatio="xMidYMid meet" clipPath="url(#cert-clip)" />}
    <text x={540} y={790} textAnchor="middle" fontSize={fitFontSize(holder, 72, 900)} fontWeight={800} fill={COLOR.ink}>{holder}</text>
    <line x1={108} y1={850} x2={972} y2={850} stroke={COLOR.line} strokeWidth={2} />
    {rows.map((row, index) => { const y = 930 + index * 90; return <g key={row.label}>
      <text x={108} y={y} fontSize={30} fontWeight={500} fill={COLOR.muted}>{row.label}</text>
      <text x={972} y={y} textAnchor="end" fontSize={fitFontSize(row.value, 36, 560)} fontWeight={700} fill={COLOR.ink}>{row.value}</text>
    </g>; })}
    <line x1={108} y1={1060} x2={972} y2={1060} stroke={COLOR.line} strokeWidth={2} />
    {assets && <image href={assets.wordmark} x={440} y={1140} width={200} height={38} preserveAspectRatio="xMidYMid meet" />}
    <text x={540} y={1270} textAnchor="middle" fontSize={22} fontWeight={500} fill={COLOR.subtle}>발급일 {date} · firstfriend.me</text>
  </svg>;
}

/** 카드 + "이미지 저장". 공유하기 버튼은 부모의 하단 푸터에 있으므로 ref로 share(url)를 넘겨 줍니다. */
export function CertificateResult({ ref, badge, illustration, memberName, rows, share: shareText, extraAction }: ResultProps) {
  const feedback = useAppFeedback();
  const cardRef = useRef<SVGSVGElement>(null);
  const [issued] = useState(() => { const date = cardDate(); return { date, number: certificateNumber(date) }; });
  const [assets, setAssets] = useState<Assets | null>(null);
  const [busy, setBusy] = useState(false);
  const holder = memberName?.trim() ? memberName.trim().slice(0, 12) : HOLDER_FALLBACK;

  useEffect(() => {
    if (assets?.src === illustration) return;
    let active = true;
    Promise.all([toDataUrl(illustration), toDataUrl("/logo-wordmark.webp")])
      .then(([image, wordmark]) => { if (active) setAssets({ src: illustration, illustration: image, wordmark }); })
      .catch(() => { if (active) feedback.error("인증서 이미지를 준비하지 못했어요"); });
    return () => { active = false; };
  }, [illustration, assets, feedback]);

  async function toFile() {
    const card = cardRef.current;
    if (!card || !assets) return null;
    return new File([await exportCardPng(card)], `firstfriend-${issued.number}.png`, { type: "image/png" });
  }
  function download(file: File) {
    const link = document.createElement("a"); link.href = URL.createObjectURL(file); link.download = file.name; link.click();
    window.setTimeout(() => URL.revokeObjectURL(link.href), 1000);
  }
  async function saveImage() {
    setBusy(true);
    try {
      const file = await toFile();
      if (!file) throw new Error("인증서가 아직 준비되지 않았어요");
      download(file);
      feedback.success("이미지를 저장했어요");
    } catch {
      feedback.error("이미지를 저장하지 못했어요");
    } finally {
      setBusy(false);
    }
  }
  // 모바일은 PNG를 기기 공유 시트로, PC나 파일 공유가 안 되는 환경은 PNG 저장 + 링크 복사(WorldCupFinder.share와 같은 순서).
  async function share(url: string) {
    setBusy(true);
    try {
      const file = await toFile().catch(() => null);
      const mobile = window.matchMedia("(max-width: 767px)").matches;
      if (mobile && file && typeof navigator.canShare === "function" && navigator.canShare({ files: [file] })) { await navigator.share({ files: [file], title: shareText.title, text: `${shareText.text}\n${url}` }); return; }
      if (file) download(file);
      else if (mobile && navigator.share) { await navigator.share({ title: shareText.title, text: shareText.text, url }); return; }
      await navigator.clipboard.writeText(url);
      feedback.success(file ? "인증서를 저장하고 링크를 복사했어요" : "공유 링크를 복사했어요");
    } catch (error) {
      if (error instanceof DOMException && error.name === "AbortError") return;
      feedback.error("공유를 완료하지 못했어요");
    } finally {
      setBusy(false);
    }
  }
  useImperativeHandle(ref, () => ({ share }));

  return <div className="ff-certificate">
    <CertificateCard ref={cardRef} badge={badge} number={issued.number} date={issued.date} holder={holder} rows={rows} assets={assets} />
    <div className="ff-certificate-actions">
      <button type="button" onClick={() => void saveImage()} disabled={!assets || busy}><IconArrowDownHorizlineLine aria-hidden />이미지 저장</button>
      {extraAction}
    </div>
  </div>;
}
