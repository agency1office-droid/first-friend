import type { Metadata, Viewport } from "next";
import { preload } from "react-dom";
import "./globals.css";
import { AppChrome } from "./components/AppChrome";
import { AppFeedbackProvider } from "./components/AppFeedback";
import { ServiceAnalytics } from "./components/ServiceAnalytics";

export function generateMetadata(): Metadata {
  const origin = "https://www.firstfriend.me";
  return { metadataBase: new URL(origin), title: { default: "퍼스트 프렌드", template: "%s | 퍼스트 프렌드" }, description: "그림으로 닮은 보호동물을 발견하고 안전한 입양을 시작하세요.", openGraph: { title: "퍼스트 프렌드", description: "그림으로 닮은 보호동물을 발견하고 안전한 입양을 시작하세요.", type: "website", locale: "ko_KR", images: [{ url: `${origin}/og.png`, width: 1734, height: 907 }] }, twitter: { card: "summary_large_image", images: [`${origin}/og.png`] } };
}

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default async function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  // Fetch the existing stylesheet earlier; globals.css still owns its application.
  preload("https://cdn.jsdelivr.net/gh/orioncactus/pretendard@v1.3.9/dist/web/variable/pretendardvariable-dynamic-subset.css", { as: "style" });
  return <html lang="ko" data-seed data-seed-color-mode="light-only"><head><meta name="color-scheme" content="light" /><meta name="naver-site-verification" content="1a37f03970ad7c604ca0073b7df81d9fbe22e8fa" /><link rel="icon" href="/favicon.svg" type="image/svg+xml" /><link rel="icon" href="/favicon.ico" sizes="any" /><link rel="apple-touch-icon" href="/apple-touch-icon.png" /><link rel="manifest" href="/manifest.webmanifest" /></head><body><AppFeedbackProvider><AppChrome>{children}</AppChrome></AppFeedbackProvider><ServiceAnalytics/></body></html>;
}
