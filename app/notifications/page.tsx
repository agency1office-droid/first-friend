import type { Metadata } from "next";
import { getChatGPTUser } from "../chatgpt-auth";
import { LoginSheet } from "../components/LoginSheet";
import { NotificationCenter } from "../components/NotificationCenter";
export const dynamic = "force-dynamic";
export const metadata: Metadata = { title:"알림함" };
export default async function NotificationsPage(){
 const user=await getChatGPTUser();
 // 관심 친구 탭과 같은 로그인 시트를 쓴다. 무엇을 받게 되는지 먼저 알려야 로그인할 이유가 생긴다.
 if(!user)return <div className="ff-page"><h1 className="ff-visually-hidden">알림함</h1><LoginSheet returnTo="/notifications" prompt="로그인하면 내 글에 달린 반응, 저장한 조건에 맞는 새 친구, 신청 진행 소식을 여기서 받아요" title="퍼스트프렌드 로그인" description="알림을 받으려면 로그인이 필요해요"/></div>;
 return <div className="ff-page"><header className="ff-page-header"><div className="ff-kicker">나의 소식</div><h1 className="ff-title">알림함</h1><p className="ff-description">내 글의 반응, 저장 검색 매칭, 신청 진행 소식을 한곳에서 확인해요.</p></header><NotificationCenter/></div>}
