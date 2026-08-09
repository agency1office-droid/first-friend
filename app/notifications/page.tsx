import type { Metadata } from "next";
import { requireChatGPTUser } from "../chatgpt-auth";
import { NotificationCenter } from "../components/NotificationCenter";
export const dynamic = "force-dynamic";
export const metadata: Metadata = { title:"알림함" };
export default async function NotificationsPage(){await requireChatGPTUser("/notifications");return <div className="ff-page"><header className="ff-page-header"><div className="ff-kicker">나의 소식</div><h1 className="ff-title">알림함</h1><p className="ff-description">저장 검색, 신청 진행, 돌봄 위기 지원 소식을 한곳에서 확인해요.</p></header><NotificationCenter/></div>}
