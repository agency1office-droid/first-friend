import type { Metadata } from "next";
import { FosterRegistration } from "../components/FosterRegistration";
import { Callout } from "seed-design/ui/callout";
import { ActionButton } from "seed-design/ui/action-button";

export const metadata: Metadata = { title: "임시보호 동물 등록" };
export default function FosterPage() { return <div className="ff-page"><header className="ff-page-header"><div className="ff-kicker">구조와 임시보호</div><h1 className="ff-title">혼자 감당하지 않고<br/>안전한 가족을 찾아요</h1><p className="ff-description">본인 확인과 기본 교육을 마친 개인 임시보호자는 동물을 직접 등록하고 표준 입양 절차를 이용할 수 있어요.</p><ActionButton asChild variant="neutralWeak"><a href="/foster/manage">내 등록 동물·신청자 관리</a></ActionButton></header><Callout tone="critical" title="판매·사례비 요구 금지" description="실제 치료비 등 비용을 알릴 때도 항목과 근거를 투명하게 표시해야 하며 동물 자체의 가격이나 개인 수익을 요구할 수 없습니다."/><div className="ff-divider"/><section className="ff-section"><FosterRegistration/></section></div>; }
