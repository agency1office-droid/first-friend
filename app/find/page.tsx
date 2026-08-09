import type { Metadata } from "next";
import { Finder } from "../components/Finder";
export const metadata: Metadata = { title: "친구 찾기", description: "그림·사진·조건으로 나와 닮은 보호동물을 찾아보세요." };
export default function FindPage() { return <div className="page"><span className="eyebrow">Find a friend</span><h1 className="page-title">친구 찾기</h1><p className="page-subtitle">그림의 느낌과 공개된 특징을 바탕으로 후보를 보여드려요. 건강이나 성격을 AI가 추측하지 않습니다.</p><Finder /></div>; }
