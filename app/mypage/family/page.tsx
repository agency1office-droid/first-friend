import type { Metadata } from "next";
import { requireChatGPTUser } from "../../chatgpt-auth";
import { getSupabaseServerClient } from "../../../lib/supabase/server";
import { List, ListDivider, ListLinkItem } from "seed-design/ui/list";
import { IconChevronRightLine, IconPeople3Line } from "@karrotmarket/react-monochrome-icon";
export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "가족과 상의한 친구" };
export default async function Page() {
  const user = await requireChatGPTUser("/mypage/family"), { data: rows } = await getSupabaseServerClient().from("family_rooms").select("*").eq("owner_id", user.userId).order("created_at", { ascending: false });
  return <div className="ff-page"><header className="ff-page-header"><div className="ff-kicker">가족과 함께 보기</div><h1 className="ff-title">상의 중인 친구</h1><p className="ff-description">찬성·질문·걱정을 함께 모아 입양 전 준비에 반영하세요.</p></header><List>{(rows || []).map((row, index) => <div key={row.id}><ListLinkItem href={`/family/${row.share_token}`} prefix={<IconPeople3Line />} title={row.title} detail={`${row.status} · ${new Date(row.created_at).toLocaleDateString("ko-KR")}`} suffix={<IconChevronRightLine />} />{index < (rows || []).length - 1 && <ListDivider />}</div>)}</List>{!rows?.length && <div className="ff-empty">동물 상세에서 ‘질문·가족 상의’를 눌러 시작하세요.</div>}</div>;
}
