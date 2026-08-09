import type { Metadata } from "next";
import { AuthForm } from "../components/AuthForm";
export const metadata: Metadata = { title: "로그인·회원가입" };
export default async function Page({ searchParams }: { searchParams: Promise<{ return_to?: string; oauth?: string; provider?: string }> }) { const query = await searchParams; return <div className="ff-page"><header className="ff-page-header"><div className="ff-kicker">퍼스트프렌드 계정</div><h1 className="ff-title">입양과 보호 활동을<br/>한 계정에서 이어가요</h1><p className="ff-description">이메일 또는 소셜 계정으로 가입하고 신청·상담·봉사·보호소 운영 기록을 안전하게 관리하세요.</p></header><AuthForm returnTo={query.return_to} oauthStatus={query.oauth} provider={query.provider}/></div>; }
