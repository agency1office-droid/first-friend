import type { Metadata } from "next";
import { requireChatGPTUser } from "../../chatgpt-auth";
import { ApplicationProgress } from "../../components/ApplicationProgress";
export const metadata: Metadata = { title: "입양 진행 상황" };
export default async function ApplicationPage({ params }: { params: Promise<{id:string}> }) { const {id} = await params; await requireChatGPTUser(`/applications/${id}`); return <div className="ff-page"><header className="ff-page-header"><div className="ff-kicker">안전한 입양 과정</div><h1 className="ff-title">입양 진행 상황</h1><p className="ff-subtitle">상담부터 약정과 양측 인계 확인까지 한곳에 기록합니다.</p></header><ApplicationProgress id={Number(id)}/></div>; }
