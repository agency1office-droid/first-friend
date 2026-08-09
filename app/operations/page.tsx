import type { Metadata } from "next";
import { requireChatGPTUser } from "../chatgpt-auth";
import { OperationsConsole } from "../components/OperationsConsole";
export const dynamic="force-dynamic";export const metadata:Metadata={title:"보호처 운영 콘솔"};
export default async function OperationsPage(){await requireChatGPTUser("/operations");return <div className="ff-page"><header className="ff-page-header"><div className="ff-kicker">보호처·운영자 도구</div><h1 className="ff-title">입양 과정을<br/>안전하게 운영해요</h1><p className="ff-description">신청 검토, 직접 등록 심사, 역할 인증, 신고와 반환 도움을 한곳에서 관리합니다.</p></header><OperationsConsole/></div>}
