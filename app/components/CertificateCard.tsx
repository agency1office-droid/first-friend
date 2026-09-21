"use client";

import { useEffect, useId, useImperativeHandle, useRef, useState, type PointerEvent, type ReactNode, type Ref } from "react";
import { IconArrowDownHorizlineLine, IconArrowUpBracketDownLine, IconMobileLine } from "@karrotmarket/react-monochrome-icon";
import { COLOR, FONT, cardDate, exportCardPng, fitFontSize, toDataUrl } from "../../lib/card-export";
import { useAppFeedback } from "./AppFeedback";
import QRCode from "qrcode";
import { motion, useSpring, useTransform, type MotionStyle } from "motion/react";

// 상식 퀴즈·입양 준비·입양 환경 점검 결과의 인증서 카드. 인연 카드(WorldCupCard)와 같은 방식으로
// 화면의 SVG 비율 그대로 PNG로 내보냅니다. 진행 바는 SEED gray-1000으로 통일합니다.
export type CertificateRow = { label: string; value: string };
export type CertificateHandle = { share(url: string): Promise<void>; save(): Promise<void> };
type Quiz = "pet-knowledge" | "adoption-prep" | "care-readiness";
type Assets = { src: string; illustration: string; wordmark: string; qr: string };
type CardProps = { ref?: Ref<SVGSVGElement>; quiz: Quiz; badge: string; number: string; date: string; holder: string; rows: CertificateRow[]; assets: Assets | null };
type ResultProps = { ref?: Ref<CertificateHandle>; quiz: Quiz; badge: string; illustration: string; memberName?: string | null; rows: CertificateRow[]; share: { title: string; text: string }; onShare?: () => Promise<void>; extraAction?: ReactNode };

const HOLDER_FALLBACK = "첫 친구 예비 반려인";

// 발급 번호는 장식용입니다. 저장하지 않으므로 검증에 쓸 수 없고, http LAN에서는 crypto.randomUUID가 없어 Math.random을 씁니다.
function certificateNumber(date: string) {
  return `FF-${date.slice(2).replace(/\./g, "")}-${Math.random().toString(36).slice(2, 6).padEnd(4, "0").toUpperCase()}`;
}

export function medalTone(ratio: number) {
  return ratio >= 1 ? "gold" : ratio >= 0.8 ? "silver" : "bronze";
}

export function tiltPosition(beta: number, gamma: number, base: [number, number], angle: number) {
  const vertical = ((beta - base[0] + 540) % 360) - 180;
  const horizontal = ((gamma - base[1] + 540) % 360) - 180;
  const radians = angle * Math.PI / 180;
  const clamp = (value: number) => Math.max(0, Math.min(100, 50 + value * 2));
  return [clamp(horizontal * Math.cos(radians) + vertical * Math.sin(radians)), clamp(vertical * Math.cos(radians) - horizontal * Math.sin(radians))];
}

function Medal({ x, y, size = 1, tone, date }: { x: number; y: number; size?: number; tone: ReturnType<typeof medalTone>; date: string }) {
  const id = useId().replace(/:/g, "");
  const gold = tone === "gold", bronze = tone === "bronze";
  const dark = gold ? "#b7973e" : bronze ? "#a36743" : "#9099a3";
  return <g transform={`translate(${x} ${y}) scale(${size})`}>
    <defs>
      <linearGradient id={id} x1="0" y1="0" x2="1" y2="1"><stop stopColor={gold ? "#fff1ad" : bronze ? "#f2d0b9" : "#e0e5ea"} /><stop offset="1" stopColor={gold ? "#f3d76a" : bronze ? "#c88e68" : "#bbc4ce"} /></linearGradient>
      <path id={`${id}-date`} d="M -92 -8 A 92 92 0 0 1 -8 -92" />
    </defs>
    <circle r={122} fill={gold ? "#efdb8c" : bronze ? "#d8a785" : "#d2d8df"} />
    <circle r={111} fill={`url(#${id})`} />
    <path d="M 18 -103 A 105 105 0 1 1 -103 18" fill="none" stroke={dark} strokeWidth={9} opacity={0.65} />
    <path d="M 17 -98 A 100 100 0 1 1 -98 17" fill="none" stroke={gold ? "#fff6c4" : bronze ? "#ffe8d8" : "#eef1f4"} strokeWidth={3} opacity={0.55} />
    <text fill={dark} fontSize={18} fontWeight={800} textAnchor="middle"><textPath href={`#${id}-date`} startOffset="50%">{date.slice(0, 7).replace(".", " / ")}</textPath></text>
    <g fill={dark}>
      <path d="M -58 -26 Q -63 -22 -58 -18 L -4 12 Q 0 15 5 12 L 59 -18 Q 63 -22 58 -26 L 5 -54 Q 0 -57 -5 -54 Z" />
      <path d="M -42 8 L -5 28 Q 0 31 5 28 L 41 8 L 41 31 Q 41 37 35 41 L 8 55 Q 0 60 -8 55 L -35 41 Q -42 37 -42 31 Z" />
      <rect x={52} y={-23} width={10} height={61} rx={5} />
    </g>
    <path d="M -57 -23 L 0 -54 L 58 -23" fill="none" stroke={gold ? "#967821" : bronze ? "#875236" : "#717b86"} strokeWidth={3} opacity={0.25} />
  </g>;
}

export function CertificateCard({ ref, quiz, badge, number, date, holder, rows, assets }: CardProps) {
  const borderId = `certificate-border-${useId().replace(/:/g, "")}`;
  const checked = badge.includes("확인서");
  const title = badge.replace(/ (수료증|확인서)$/, "");
  const value = rows[0]?.value ?? "";
  const [earned, total] = value.split("/").map(Number);
  const ratio = Math.min(1, Math.max(0, value.includes("%") ? parseFloat(value) / 100 : total > 0 ? earned / total : 0));
  const detail = checked ? rows.map(row => `${row.label} ${row.value}`).join(" · ") : `${total}문제 중 ${earned}문제 정답`;
  const tone = medalTone(ratio);
  const border = tone === "gold" ? ["#d4ab28", "#fdefb9"] : tone === "silver" ? ["#9099a3", "#e0e5ea"] : ["#a36743", "#f2d0b9"];
  const retry = tone === "bronze" && !checked;
  const medalLabel = tone === "gold" ? "금메달" : tone === "silver" ? "은메달" : "동메달";
  const rank = tone === "gold" ? "상위 1%" : tone === "silver" ? "상위 10%" : "상위 50%";
  const grade = rows.find(row => row.label === "등급")?.value;
  const rankTitle = grade ? `${rank} · ${grade}` : rank;
  const scoreLabel = checked ? `함께할 생활 준비도 ${value}` : `정답률 ${Math.round(ratio * 100)}% · ${earned}/${total} 정답`;
  const invitation = quiz === "pet-knowledge" ? "나도 상식 퀴즈 풀어보기" : quiz === "adoption-prep" ? "나도 입양 준비 퀴즈 풀어보기" : "나도 입양 환경 점검하기";
  return <svg ref={ref} className="ff-certificate-card" data-medal={tone} viewBox="0 0 748 1260" role="img" aria-label={`${holder} ${retry ? title + " 도전 기록" : badge}, ${medalLabel}, ${detail}, 발급 번호 ${number}, QR로 ${invitation}`} fontFamily={FONT}>
    <defs>
      <linearGradient id={borderId} x1="0" y1="0" x2="1" y2="1">
        <stop stopColor={border[0]} /><stop offset="0.5" stopColor={border[1]} /><stop offset="1" stopColor={border[0]} />
      </linearGradient>
    </defs>
    <rect x={1.5} y={1.5} width={745} height={1257} rx={28.5} fill={COLOR.white} stroke={`url(#${borderId})`} strokeWidth={3} />
    <Medal x={374} y={207} tone={tone} date={date} />
    <text x={374} y={419} textAnchor="middle" fontSize={27} fontWeight={700} fill="#adb6bf">{medalLabel} · {checked ? "점검 완료" : retry ? "다시 도전해요" : "수료 완료"}</text>
    <text x={374} y={496} textAnchor="middle" fontSize={64} fontWeight={800} fill="#000">{title}</text>
    <text x={374} y={578} textAnchor="middle" fontSize={64} fontWeight={800} fill="#000">{checked ? "확인서" : retry ? "도전 기록" : "수료증"}</text>
    <text x={374} y={667} textAnchor="middle" fontSize={fitFontSize(`${holder}님의 소중한 첫걸음`, 38, 650)} fill="#000">{holder}님의 소중한 첫걸음</text>
    <text x={374} y={761} textAnchor="middle" fontSize={fitFontSize(checked ? detail : rankTitle, 27, 600)} fontWeight={700} fill={checked ? COLOR.muted : COLOR.brand}>{checked ? detail : rankTitle}</text>
    <text x={34} y={930} fontSize={28} fontWeight={600} fill={COLOR.muted}>{scoreLabel}</text>
    <rect x={34} y={959} width={500} height={13} rx={6.5} fill="#eeeff1" />
    <rect x={34} y={959} width={500 * ratio} height={13} rx={6.5} fill={COLOR.ink} />
    {assets && <image href={assets.illustration} x={554} y={850} width={160} height={160} preserveAspectRatio="xMidYMax meet" aria-hidden="true" />}
    <path d="M 34 1034 H 714" stroke={COLOR.line} />
    {assets && <>
      <image href={assets.qr} x={66} y={1056} width={152} height={152} aria-hidden="true" />
      <image href={assets.wordmark} x={246} y={1070} width={160} height={46} preserveAspectRatio="xMinYMid meet" aria-hidden="true" />
    </>}
    <text x={246} y={1153} fontSize={fitFontSize(invitation, 25, 440)} fontWeight={600} fill={COLOR.ink}>{invitation}</text>
    <text x={246} y={1189} fontSize={22} fill={COLOR.muted}>QR을 스캔해 시작해 보세요.</text>
    <text x={374} y={1234} textAnchor="middle" fontSize={16} fill={COLOR.subtle}>발급일 {date}</text>
  </svg>;
}

/** 카드 + "이미지 저장". 공유하기 버튼은 부모의 하단 푸터에 있으므로 ref로 share(url)를 넘겨 줍니다. */
export function CertificateResult({ ref, quiz, badge, illustration, memberName, rows, share: shareText, onShare, extraAction }: ResultProps) {
  const foilId = `certificate-foil-${useId().replace(/:/g, "")}`;
  const feedback = useAppFeedback();
  const cardRef = useRef<SVGSVGElement>(null);
  const holoRef = useRef<HTMLDivElement>(null);
  const [tiltEnabled, setTiltEnabled] = useState(false);
  const [tiltPending, setTiltPending] = useState(false);
  const [tiltHint, setTiltHint] = useState(false);
  const [issued] = useState(() => { const date = cardDate(); return { date, number: certificateNumber(date) }; });
  const [assets, setAssets] = useState<Assets | null>(null);
  const [busy, setBusy] = useState(false);
  const foilX = useSpring(50, { stiffness: 170, damping: 26, mass: 0.6 });
  const foilY = useSpring(50, { stiffness: 170, damping: 26, mass: 0.6 });
  const rotateX = useTransform(foilY, [0, 100], [2, -2]);
  const rotateY = useTransform(foilX, [0, 100], [-2, 2]);
  const shineX = useTransform(foilX, value => `${value}%`);
  const shineY = useTransform(foilY, value => `${value}%`);
  const holder = memberName?.trim() ? memberName.trim().slice(0, 12) : HOLDER_FALLBACK;

  useEffect(() => {
    const frame = window.requestAnimationFrame(() => {
      if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
      const mobile = window.matchMedia("(pointer: coarse)").matches;
      const sensor = window.DeviceOrientationEvent as (typeof DeviceOrientationEvent & { requestPermission?: () => Promise<string> }) | undefined;
      if (mobile && window.isSecureContext && sensor) {
        if (sensor.requestPermission) setTiltHint(true);
        else setTiltEnabled(true);
      } else if (process.env.NODE_ENV !== "production") setTiltHint(true);
    });
    return () => window.cancelAnimationFrame(frame);
  }, []);

  async function enableTilt() {
    if (tiltEnabled || tiltPending || !tiltHint) return;
    if (!window.isSecureContext || !window.DeviceOrientationEvent) { feedback.error("이 기기에서는 기울여 보기를 사용할 수 없어요."); return; }
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    setTiltPending(true);
    try {
      const sensor = window.DeviceOrientationEvent as typeof DeviceOrientationEvent & { requestPermission?: () => Promise<string> };
      if (sensor.requestPermission && await sensor.requestPermission() !== "granted") { setTiltHint(false); feedback.error("기울여 보려면 동작 센서 접근을 허용해 주세요."); return; }
      setTiltHint(false);
      setTiltEnabled(true);
    } catch { feedback.error("기울기 센서를 켜지 못했어요."); }
    finally { setTiltPending(false); }
  }

  useEffect(() => {
    if (!tiltEnabled) return;
    let base: [number, number] | null = null;
    let received = false;
    const surface = holoRef.current;
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)");
    function reset() {
      base = null;
      if (surface) delete surface.dataset.tilt;
      foilX.set(50); foilY.set(50);
    }
    function orient(event: DeviceOrientationEvent) {
      if (document.hidden || reduced.matches || event.beta === null || event.gamma === null || !Number.isFinite(event.beta) || !Number.isFinite(event.gamma)) return;
      received = true;
      base ??= [event.beta, event.gamma];
      const [x, y] = tiltPosition(event.beta, event.gamma, base, window.screen.orientation?.angle ?? 0);
      foilX.set(x); foilY.set(y);
      if (surface) surface.dataset.tilt = "true";
    }
    function reduceMotion() { if (reduced.matches) { reset(); setTiltEnabled(false); } }
    const timeout = window.setTimeout(() => {
      if (!received) setTiltEnabled(false);
    }, 5000);
    window.addEventListener("deviceorientation", orient);
    window.screen.orientation?.addEventListener("change", reset);
    document.addEventListener("visibilitychange", reset);
    reduced.addEventListener("change", reduceMotion);
    return () => {
      window.clearTimeout(timeout);
      window.removeEventListener("deviceorientation", orient);
      window.screen.orientation?.removeEventListener("change", reset);
      document.removeEventListener("visibilitychange", reset);
      reduced.removeEventListener("change", reduceMotion);
      reset();
    };
  }, [tiltEnabled, foilX, foilY, feedback]);

  useEffect(() => {
    const src = `${quiz}:${illustration}`;
    if (assets?.src === src) return;
    let active = true;
    Promise.all([toDataUrl(illustration), toDataUrl("/logo-wordmark.webp"), QRCode.toDataURL(`https://www.firstfriend.me/quiz/${quiz}`, { width: 456, margin: 4, errorCorrectionLevel: "M", color: { dark: COLOR.ink, light: COLOR.white } })])
      .then(([image, wordmark, qr]) => { if (active) setAssets({ src, illustration: image, wordmark, qr }); })
      .catch(() => { if (active) feedback.error("인증서 이미지를 준비하지 못했어요"); });
    return () => { active = false; };
  }, [quiz, illustration, assets, feedback]);

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
  useImperativeHandle(ref, () => ({ share, save: saveImage }));

  function moveFoil(event: PointerEvent<HTMLDivElement>) {
    if (tiltEnabled) return;
    if (event.pointerType !== "mouse" || !window.matchMedia("(hover: hover) and (pointer: fine) and (prefers-reduced-motion: no-preference)").matches) return;
    const surface = event.currentTarget;
    const rect = surface.getBoundingClientRect();
    const x = Math.max(0, Math.min(1, (event.clientX - rect.left) / rect.width));
    const y = Math.max(0, Math.min(1, (event.clientY - rect.top) / rect.height));
    foilX.set(x * 100);
    foilY.set(y * 100);
    surface.dataset.active = "true";
  }
  function resetFoil(event: PointerEvent<HTMLDivElement>) {
    if (tiltEnabled) return;
    delete event.currentTarget.dataset.active;
    foilX.set(50);
    foilY.set(50);
  }

  return <div className="ff-certificate">
    <div ref={holoRef} className="ff-certificate-holo" role={tiltHint ? "button" : undefined} tabIndex={tiltHint ? 0 : undefined} aria-label={tiltHint ? "카드 기울기 효과 켜기" : undefined} aria-describedby={tiltHint ? `${foilId}-hint` : undefined} aria-disabled={tiltHint ? tiltPending : undefined} onClick={() => void enableTilt()} onKeyDown={event => { if (tiltHint && (event.key === "Enter" || event.key === " ")) { event.preventDefault(); void enableTilt(); } }} onPointerEnter={moveFoil} onPointerMove={moveFoil} onPointerLeave={resetFoil} onPointerCancel={resetFoil}>
      <motion.div className="ff-certificate-holo-surface" style={{ rotateX, rotateY, "--foil-x": shineX, "--foil-y": shineY } as MotionStyle}>
        <CertificateCard ref={cardRef} quiz={quiz} badge={badge} number={issued.number} date={issued.date} holder={holder} rows={rows} assets={assets} />
        {assets && <svg className="ff-certificate-logo-foil" viewBox="0 0 748 1260" aria-hidden="true">
          <defs>
            <pattern id={`${foilId}-pattern`} width={230} height={110} patternUnits="userSpaceOnUse" patternTransform="rotate(-25)">
              <image href={assets.wordmark} x={25} y={35} width={165} height={33} preserveAspectRatio="xMidYMid meet" />
            </pattern>
            <mask id={`${foilId}-mask`} style={{ maskType: "alpha" }}>
              <rect width={748} height={1260} fill={`url(#${foilId}-pattern)`} />
            </mask>
            <motion.radialGradient id={`${foilId}-shine`} cx={shineX} cy={shineY} r="65%">
              <stop stopColor="var(--seed-color-palette-yellow-200)" />
              <stop offset=".25" stopColor="var(--seed-color-palette-blue-400)" />
              <stop offset=".5" stopColor="var(--seed-color-palette-purple-400)" stopOpacity=".6" />
              <stop offset="1" stopColor="var(--seed-color-palette-blue-400)" stopOpacity="0" />
            </motion.radialGradient>
          </defs>
          <rect x={2} y={2} width={744} height={1256} rx={28} fill={`url(#${foilId}-shine)`} mask={`url(#${foilId}-mask)`} />
        </svg>}
      </motion.div>
    </div>
    {tiltHint && <p id={`${foilId}-hint`} className="ff-certificate-tilt-hint"><IconMobileLine aria-hidden /><span>{tiltPending ? "권한을 확인하고 있어요" : "카드를 톡 누르고, 기울이면 반짝반짝 빛나요."}</span></p>}
    <div className="ff-certificate-actions">
      <button type="button" onClick={() => void (onShare ? onShare() : saveImage())} disabled={!assets || busy}>{onShare ? <><IconArrowUpBracketDownLine aria-hidden />공유하기</> : <><IconArrowDownHorizlineLine aria-hidden />이미지 저장</>}</button>
      {extraAction}
    </div>
  </div>;
}
