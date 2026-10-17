import type { Metadata } from "next";
import { ActionButton } from "seed-design/ui/action-button";
import { serviceContactEmail } from "../../lib/service-contact";

export const metadata: Metadata = { title: "문의하기" };
export const dynamic = "force-dynamic";
export default function ContactPage() {
  const email = serviceContactEmail();
  return <div className="ff-page ff-legal"><header className="ff-page-header"><h1 className="ff-title">문의하기</h1><p className="ff-description">로그인하지 않아도 문의할 수 있어요.</p></header>
    <section><h2>퍼스트 프렌드 운영 문의</h2><p>서비스 이용, 보호소 정보 수정, 제휴, 신고, 계정 접근 문제를 알려주세요.</p><ActionButton asChild><a href={`mailto:${email}`}>이메일로 문의하기</a></ActionButton><p>{email}</p></section>
    <section><h2>개인정보 관련 요청</h2><p>개인정보 열람·정정·삭제·처리정지와 탈퇴는 같은 이메일로 요청해 주세요. 본인 확인 후 처리하고 결과를 안내해요. 비밀번호나 신분증 전체 사진은 보내지 마세요.</p></section>
    <section><h2>동물과의 만남</h2><p>입양 상담과 방문 일정은 동물 상세 화면의 연락하기를 눌러 보호소에 확인해 주세요.</p></section>
  </div>;
}
