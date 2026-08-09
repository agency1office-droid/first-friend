import type { Metadata } from "next";
import { LostCaseManager } from "../../components/LostCaseManager";
export const metadata:Metadata={title:"실종·발견 안전 연결"};
export default async function Page({params}:{params:Promise<{id:string}>}){const{id}=await params;return <div className="ff-page"><header className="ff-page-header"><div className="ff-kicker">비공개 안전 연결</div><h1 className="ff-title">연락처를 공개하지 않고<br/>함께 찾을 수 있어요</h1></header><LostCaseManager id={Number(id)}/></div>}
