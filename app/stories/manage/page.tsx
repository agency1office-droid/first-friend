import type { Metadata } from "next";
import { requireChatGPTUser } from "../../chatgpt-auth";
import { getSupabaseServerClient } from "../../../lib/supabase/server";
import { PostManager } from "../../components/PostManager";
export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "내 이야기 관리" };
export default async function Page() {
  const user = await requireChatGPTUser("/stories/manage"), { data } = await getSupabaseServerClient().from("posts").select("*").eq("member_id", user.userId).order("created_at", { ascending: false });
  const rows = (data || []).map(row => ({ ...row, memberId: row.member_id, imageKey: row.image_key, updatedAt: row.updated_at, createdAt: row.created_at }));
  return <div className="ff-page"><header className="ff-page-header"><div className="ff-kicker">내 이야기</div><h1 className="ff-title">공개한 글을<br />관리하세요</h1><p className="ff-description">수정·삭제·공유 기록을 직접 관리할 수 있어요.</p></header><PostManager initial={rows} /></div>;
}
