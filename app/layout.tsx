import type { Metadata, Viewport } from "next";
import "./globals.css";
import { AppChrome } from "./components/AppChrome";
import { AppFeedbackProvider } from "./components/AppFeedback";

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
  return <html lang="ko" data-seed data-seed-color-mode="light-only"><head><meta name="color-scheme" content="light" /></head><body><AppFeedbackProvider><AppChrome>{children}</AppChrome></AppFeedbackProvider></body></html>;
}
