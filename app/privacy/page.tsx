import type { Metadata } from "next";
import { serviceContactEmail } from "../../lib/service-contact";
export const metadata: Metadata = { title: "개인정보 처리방침" };
export const dynamic = "force-dynamic";
export default function Page() {
  const email = serviceContactEmail();
  return <div className="ff-page ff-legal"><header className="ff-page-header"><div className="ff-kicker">변경일 2026년 10월 17일</div><h1 className="ff-title">개인정보 처리방침</h1><p className="ff-description">퍼스트 프렌드에서 처리하는 정보와 이용자의 권리를 안내해요.</p></header>
    <section><h2>처리하는 정보와 목적</h2><p>회원 식별을 위해 로그인 제공자 식별값, 표시 이름과 제공되는 이메일을 처리해요. 입양 신청에는 생활환경·돌봄·응급계획과 상담·동의·인계 기록이 포함될 수 있어요. 보호소·임보 인증에는 담당자와 기관 확인용 증빙을 처리해요. 관심 친구, 퀴즈 결과, 게시물, 문의는 선택한 기능을 제공하기 위해 저장해요.</p></section>
    <section><h2>지역과 거리 검색</h2><p>선택한 지역 또는 위치 권한으로 얻은 좌표는 주변 동물·보호소 검색과 거리 계산을 위해 서버와 데이터베이스 검색 함수에 전달돼요. 검색 좌표를 회원 계정의 위치 이력으로 저장하지 않아요. 선택 지역은 브라우저에 보관하며, 로그인한 회원이 저장한 지역명은 계정에 저장될 수 있어요.</p><p>초기 지역에는 호스팅 서비스가 IP로 추정한 지역을 사용할 수 있어요. 요청 주소 등 접속 기록은 호스팅 사업자의 운영·보안 처리 대상이 될 수 있어요. 위치 권한은 브라우저 설정에서 해제할 수 있어요.</p></section>
    <section><h2>보관과 삭제 요청</h2><p>회원 정보와 관심 친구 등 계정 기록은 탈퇴 또는 삭제 요청이 처리될 때까지 보관해요. 로그인 세션의 유효기간은 30일이에요. 본인 확인을 마친 삭제 요청은 운영자가 처리하며, 전자파일은 복구할 수 없도록 삭제하거나 개인을 식별할 수 없도록 처리해요.</p><p>분쟁 처리나 법령상 보존 의무 때문에 삭제할 수 없는 정보는 대상·근거·보관기간을 개별 안내해요. 문의 해결 이후 불필요한 정보는 삭제 요청을 통해 정리할 수 있어요. 요청은 아래 이메일로 보내주세요.</p></section>
    <section><h2>서비스 제공 업체</h2><ul><li>Supabase: 데이터베이스와 파일 저장. 운영 데이터베이스 리전은 대한민국 서울이에요. 인증 증빙과 이야기 사진은 비공개 버킷으로 관리해요.</li><li>Vercel: 웹사이트 호스팅, 요청 처리와 접속 분석.</li><li>Resend: 이메일 발송 기능. 발송 시 수신 이메일과 내용을 처리해요.</li><li>Google Gemini: 공공데이터의 동물 사진과 정보를 바탕으로 소개를 작성해요.</li><li>Sentry(Functional Software, Inc.): 브라우저·서버 오류 진단.</li></ul><p>Google·Kakao·Naver 로그인은 선택한 제공자의 인증 화면에서 진행되며 각 제공자의 개인정보 처리방침이 함께 적용돼요.</p></section>
    <section><h2>국외 처리와 오류 진단</h2><p>Sentry 오류 정보는 오류 발생 시 미국 서버로 전송돼요. 브라우저 오류 종류·발생 시각·프로그램 파일 위치와 서버 오류 분류값을 보내며, 오류 메시지 본문·회원 정보·요청 본문·쿠키는 전송에서 제외해요. 화면 녹화는 사용하지 않아요.</p><p>해외 사업자의 Vercel·Resend·Google 서비스는 제공과 운영 과정에서 국외 처리가 수반될 수 있어요. 처리 관련 문의와 처리정지 요청은 아래 문의처에서 접수해요.</p></section>
    <section><h2>쿠키와 접속 분석</h2><p>로그인 유지와 최근 로그인 방식 표시에는 쿠키를 사용해요. 지역·필터·화면 복원에는 브라우저 저장소를 사용해요. 브라우저 설정에서 삭제하거나 차단하면 로그인 유지 등 일부 기능이 제한될 수 있어요.</p><p>Vercel Web Analytics로 공개 화면 방문을 집계해요. 검색어·좌표 등 URL의 검색 매개변수와 해시는 전송 전에 제거해요. 계정·신청·가족 상의·운영 화면은 집계에서 제외해요.</p></section>
    <section><h2>선택 동의와 아동의 정보</h2><p>소식·혜택 이메일은 선택 동의한 경우에만 보내며 수신 설정이나 이메일의 수신 거부 링크로 철회할 수 있어요. 만 14세 미만 아동의 정보 관련 요청은 법정대리인 확인 후 처리해요. 아동의 정보를 잘못 등록했다면 문의처로 알려주세요.</p></section>
    <section><h2>개인정보 문의와 권리 행사</h2><p>접수 창구: 퍼스트 프렌드 운영팀</p><p><a href={`mailto:${email}`}>{email}</a></p><p>로그인 없이 열람·정정·삭제·처리정지·탈퇴를 요청할 수 있어요. 계정과 증빙을 보호하기 위해 본인 또는 대리인 여부를 확인할 수 있어요. 비밀번호나 신분증 전체 사진은 보내지 마세요.</p><p>권익 침해 상담은 <a href="https://www.privacy.go.kr/" target="_blank" rel="noreferrer">개인정보 포털</a>과 <a href="https://www.kopico.go.kr/" target="_blank" rel="noreferrer">개인정보분쟁조정위원회</a>에서도 받을 수 있어요.</p></section>
  </div>;
}
