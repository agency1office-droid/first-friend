import type { Metadata } from "next";
import { headers } from "next/headers";
import Link from "next/link";
import "./globals.css";
import { BottomNav } from "./components/BottomNav";
import { IconBellLine } from "@karrotmarket/react-monochrome-icon";

export async function generateMetadata(): Promise<Metadata> {
  const requestHeaders = await headers();
  const host = requestHeaders.get("x-forwarded-host") ?? requestHeaders.get("host") ?? "localhost:3000";
  const protocol = requestHeaders.get("x-forwarded-proto") ?? (host.startsWith("localhost") ? "http" : "https");
  const origin = `${protocol}://${host}`;
  return { metadataBase: new URL(origin), title: { default: "퍼스트 프렌드", template: "%s | 퍼스트 프렌드" }, description: "그림으로 닮은 보호동물을 발견하고 안전한 입양을 시작하세요.", openGraph: { title: "퍼스트 프렌드", description: "그림으로 닮은 보호동물을 발견하고 안전한 입양을 시작하세요.", type: "website", locale: "ko_KR", images: [{ url: `${origin}/og.png`, width: 1734, height: 907 }] }, twitter: { card: "summary_large_image", images: [`${origin}/og.png`] } };
}

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="ko" data-seed data-seed-color-mode="light-only"><head><meta name="color-scheme" content="light" /></head><body><div className="ff-shell"><header className="ff-topbar"><Link className="ff-brand" href="/">퍼스트 프렌드</Link><div className="ff-top-actions"><a className="ff-icon-link" href="/about">약속</a><a className="ff-icon-link" href="/mypage" aria-label="알림"><IconBellLine /></a></div></header><main className="ff-main">{children}</main><BottomNav /></div></body></html>;
}
