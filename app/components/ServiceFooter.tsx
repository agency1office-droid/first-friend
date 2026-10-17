import Link from "next/link";

export function ServiceFooter() {
  return <footer className="ff-service-footer" aria-label="서비스 안내">
    <nav aria-label="이용 안내"><Link href="/terms">이용약관</Link><Link href="/privacy"><strong>개인정보 처리방침</strong></Link><Link href="/contact">문의하기</Link></nav>
    <p>퍼스트 프렌드 · 보호동물과 새로운 가족의 만남을 도와요.</p>
    <p>공공 동물 정보: <a href="https://www.animal.go.kr/" target="_blank" rel="noreferrer">국가동물보호정보시스템 · 농림축산검역본부</a></p>
    <p>보호 상태와 만남 가능 여부는 방문 전에 보호소에 확인해 주세요.</p>
  </footer>;
}
