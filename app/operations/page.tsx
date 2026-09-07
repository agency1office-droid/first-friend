import type { Metadata } from "next";
import { requireChatGPTUser } from "../chatgpt-auth";
import { OperationsConsole } from "../components/OperationsConsole";
import { getSupabaseServerClient } from "../../lib/supabase/server";
import { canUseOperations } from "../../lib/operations";
export const dynamic="force-dynamic";export const metadata:Metadata={title:"보호처 운영 콘솔"};
export default async function OperationsPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const user = await requireChatGPTUser("/operations");
  const { data: member } = await getSupabaseServerClient().from("members").select("role,verified,sanctioned").eq("id", user.userId).maybeSingle();
  if (!member || !canUseOperations(member.role, member.verified, member.sanctioned)) return <div className="ff-page"><h1>운영 권한이 필요해요</h1><p>인증된 보호소 또는 운영자 계정으로 로그인해 주세요.</p><a href="/mypage">나의 페이지로 이동</a></div>;
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(await searchParams)) if (typeof value === "string") params.set(key, value);
  return <div className="ff-page"><header className="ff-page-header"><div className="ff-kicker">보호처·운영자 도구</div><h1 className="ff-title">운영 업무</h1><p className="ff-description">대기 중인 신청을 확인하고, 내용을 검토한 뒤 처리해 주세요.</p></header><OperationsConsole role={member.role} initialQuery={params.toString()}/></div>;
}
