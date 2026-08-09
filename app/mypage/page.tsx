import type{Metadata}from"next";
import{getChatGPTUser,chatGPTSignInPath,chatGPTSignOutPath}from"../chatgpt-auth";
import{ActionButton}from"seed-design/ui/action-button";
import{Callout}from"seed-design/ui/callout";
import{List,ListLinkItem,ListDivider}from"seed-design/ui/list";
import{Avatar}from"seed-design/ui/avatar";
import{IconArticleLine,IconCheckmarkShieldFill,IconChevronRightLine,IconHeartLine,IconMagnifyingglassLine}from"@karrotmarket/react-monochrome-icon";
export const dynamic="force-dynamic";
export const metadata:Metadata={title:"나의 페이지"};
export default async function MyPage(){
  const user=await getChatGPTUser();
  return <div className="ff-page"><header className="ff-page-header"><div className="ff-kicker">나의 페이지</div><h1 className="ff-title">{user?`${user.displayName}님, 안녕하세요`:"퍼스트 프렌드에 오신 걸 환영해요"}</h1></header>{!user?<section className="ff-result"><h2 className="ff-section-title">안전한 만남을 위해 본인 확인이 필요해요</h2><p className="ff-description" style={{margin:"8px 0 18px"}}>동물과 이야기는 누구나 볼 수 있고, 찜·신청·글쓰기·실종 제보는 로그인 후 이용할 수 있어요.</p><ActionButton asChild size="large" className="ff-action-link"><a href={chatGPTSignInPath("/mypage")}>ChatGPT로 로그인</a></ActionButton></section>:<><div className="ff-row"><Avatar size="48" fallback={user.displayName.slice(0,1)}/><div><strong>{user.displayName}</strong><div className="ff-meta">본인 확인 완료 · {user.email}</div></div></div><div style={{marginTop:16}}><ActionButton asChild size="small" variant="neutralWeak"><a href={chatGPTSignOutPath("/")}>로그아웃</a></ActionButton></div><div className="ff-divider"/></>}<section className="ff-section"><h2 className="ff-section-title" style={{marginBottom:10}}>나의 활동</h2><List><ListLinkItem href="/find" prefix={<IconHeartLine/>} title="관심 친구와 신청 내역" suffix={<IconChevronRightLine/>}/><ListDivider/><ListLinkItem href="/readiness" prefix={<IconCheckmarkShieldFill/>} title="입양 준비도와 교육" suffix={<IconChevronRightLine/>}/><ListDivider/><ListLinkItem href="/stories/new" prefix={<IconArticleLine/>} title="나의 공개 이야기" suffix={<IconChevronRightLine/>}/><ListDivider/><ListLinkItem href="/lost-found" prefix={<IconMagnifyingglassLine/>} title="실종·발견 신고" suffix={<IconChevronRightLine/>}/></List></section><section className="ff-section"><Callout tone="informative" title="보호자·보호소 메뉴" description="직접 등록과 보호소 인증은 운영 약관과 기본 교육 확인 후 순차적으로 열려요."/></section></div>;
}
