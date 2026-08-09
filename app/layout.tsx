import type { Metadata } from "next";
import { headers } from "next/headers";
import Link from "next/link";
import "./globals.css";
import { BottomNav } from "./components/BottomNav";

export async function generateMetadata(): Promise<Metadata> {
  const requestHeaders = await headers();
  const host = requestHeaders.get("x-forwarded-host") ?? requestHeaders.get("host") ?? "localhost:3000";
  const protocol = requestHeaders.get("x-forwarded-proto") ?? (host.startsWith("localhost") ? "http" : "https");
  const origin = `${protocol}://${host}`;
  return {
    metadataBase: new URL(origin),
    title: { default: "퍼스트 프렌드", template: "%s | 퍼스트 프렌드" },
    description: "그림에서 시작된 만남이 평생의 가족이 되도록. 보호동물 발견부터 안전한 입양까지 함께합니다.",
    openGraph: { title: "퍼스트 프렌드", description: "당신이 그린 친구와 닮은 보호동물을 만나보세요.", type: "website", locale: "ko_KR", images: [{ url: `${origin}/og.png`, width: 1734, height: 907, alt: "퍼스트 프렌드 — 그림에서 시작된 만남이 평생의 가족이 되도록" }] },
    twitter: { card: "summary_large_image", title: "퍼스트 프렌드", description: "당신이 그린 친구와 닮은 보호동물을 만나보세요.", images: [`${origin}/og.png`] },
  };
}

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="ko">
      <body>
        <div className="site-frame">
          <header className="site-header">
            <Link className="brand" href="/" aria-label="퍼스트 프렌드 홈">
              <span className="brand-mark" aria-hidden="true">첫</span>
              <span>퍼스트 프렌드</span>
            </Link>
            <a className="header-help" href="/about">우리가 지키는 약속</a>
          </header>
          <main>{children}</main>
          <BottomNav />
        </div>
      </body>
    </html>
  );
}
