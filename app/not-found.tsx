import Link from "next/link";
import { ActionButton } from "seed-design/ui/action-button";
import { Callout } from "seed-design/ui/callout";

export default function NotFound() {
  return <div className="ff-page">
    <header className="ff-page-header"><div className="ff-kicker">페이지를 찾지 못했어요</div><h1 className="ff-title">주소가 바뀌었거나<br/>내려간 글이에요</h1><p className="ff-description">입양 공고는 보호 기간이 끝나면 목록에서 내려가고, 이야기는 작성자가 지울 수 있어요.</p></header>
    <Callout tone="neutral" description="홈에서 지금 가족을 기다리는 친구들을 다시 둘러봐 주세요."/>
    <div className="ff-story-actions"><ActionButton asChild><Link href="/">홈으로 가기</Link></ActionButton><ActionButton asChild variant="neutralWeak"><Link href="/stories">이야기 보기</Link></ActionButton></div>
  </div>;
}
