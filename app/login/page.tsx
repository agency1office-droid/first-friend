import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { AuthForm } from "../components/AuthForm";
import { safeReturnTo } from "../../lib/app-auth";
export const metadata: Metadata = { title: "로그인·회원가입" };
export default async function Page({ searchParams }: { searchParams: Promise<{ return_to?: string; oauth?: string; provider?: string }> }) {
  const query = await searchParams;
  return <div className="ff-login-page">
    <h1 className="ff-login-logo"><Image src="/logo-wordmark.webp" alt="퍼스트 프렌드" width={158} height={30} priority unoptimized/></h1>
    <AuthForm returnTo={safeReturnTo(query.return_to)} oauthStatus={query.oauth} provider={query.provider}/>
    <nav className="ff-login-links" aria-label="이용 안내"><Link href="/terms">이용약관</Link><span aria-hidden>|</span><Link href="/privacy">개인정보 처리방침</Link><span aria-hidden>|</span><Link href="/about">퍼스트 프렌드 소개</Link></nav>
    <p className="ff-login-copyright">© First Friend</p>
  </div>;
}
