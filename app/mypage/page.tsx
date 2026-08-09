/* eslint-disable @next/next/no-html-link-for-pages */
import type { Metadata } from "next";
import { and, desc, eq } from "drizzle-orm";
import { getChatGPTUser, chatGPTSignInPath, chatGPTSignOutPath } from "../chatgpt-auth";
import { getDb } from "../../db";
import { applications, directAnimals, favorites, lostReports, members, notifications, posts, readinessAssessments, savedSearches } from "../../db/schema";
import { ActionButton } from "seed-design/ui/action-button";
import { Callout } from "seed-design/ui/callout";
import { List, ListLinkItem, ListDivider } from "seed-design/ui/list";
import { Avatar } from "seed-design/ui/avatar";
import { Badge } from "@seed-design/react";
import { IconArticleLine, IconCheckmarkShieldFill, IconChevronRightLine, IconGearLine, IconHeartLine, IconHousePlusLine, IconMagnifyingglassLine, IconPawprintLine, IconPersonShieldLine } from "@karrotmarket/react-monochrome-icon";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "나의 페이지" };
const statusLabel: Record<string, string> = { submitted: "접수", review: "검토 중", consulting: "상담 중", approved: "승인", rejected: "미승인", handover: "인계 중", completed: "입양 완료", return_support: "돌봄 위기 지원", withdrawn: "종료" };

export default async function MyPage() {
  const user = await getChatGPTUser();
  let dashboard: { readiness: typeof readinessAssessments.$inferSelect | undefined; applications: typeof applications.$inferSelect[]; favorites: number; posts: number; reports: number; registrations: number; searches:number; unread:number } | null = null;
  if (user) {
    try {
      const db = getDb();
      await db.insert(members).values({ id: user.userId, email: user.email, displayName: user.displayName }).onConflictDoUpdate({ target: members.id, set: { email: user.email, displayName: user.displayName } });
      const [readiness, applicationRows, favoriteRows, postRows, reportRows, registrationRows, searchRows, notificationRows] = await Promise.all([
        db.query.readinessAssessments.findFirst({ where: eq(readinessAssessments.memberId, user.userId), orderBy: [desc(readinessAssessments.completedAt)] }),
        db.select().from(applications).where(eq(applications.memberId, user.userId)).orderBy(desc(applications.createdAt)),
        db.select({ id: favorites.id }).from(favorites).where(eq(favorites.memberId, user.userId)),
        db.select({ id: posts.id }).from(posts).where(eq(posts.memberId, user.userId)),
        db.select({ id: lostReports.id }).from(lostReports).where(eq(lostReports.memberId, user.userId)),
        db.select({ id: directAnimals.id }).from(directAnimals).where(eq(directAnimals.memberId, user.userId)),
        db.select({ id:savedSearches.id }).from(savedSearches).where(eq(savedSearches.memberId,user.userId)),
        db.select({ id:notifications.id }).from(notifications).where(and(eq(notifications.memberId,user.userId),eq(notifications.read,false))),
      ]);
      dashboard = { readiness, applications: applicationRows, favorites: favoriteRows.length, posts: postRows.length, reports: reportRows.length, registrations: registrationRows.length, searches:searchRows.length, unread:notificationRows.length };
    } catch { dashboard = null; }
  }

  return <div className="ff-page">
    <header className="ff-page-header"><div className="ff-kicker">나의 페이지</div><h1 className="ff-title">{user ? `${user.displayName}님, 안녕하세요` : "퍼스트 프렌드에 오신 걸 환영해요"}</h1></header>
    {!user ? <section className="ff-result"><h2 className="ff-section-title">안전한 만남을 위해 본인 확인이 필요해요</h2><p className="ff-description" style={{ margin: "8px 0 18px" }}>동물과 이야기는 누구나 볼 수 있고, 찜·신청·글쓰기·실종 제보·직접 등록은 로그인 후 이용할 수 있어요.</p><ActionButton asChild size="large" className="ff-action-link"><a href={chatGPTSignInPath("/mypage")}>ChatGPT로 로그인</a></ActionButton></section> : <>
      <div className="ff-profile-row"><Avatar size="48" fallback={user.displayName.slice(0, 1)}/><div className="ff-grow"><strong>{user.displayName}</strong><div className="ff-meta">본인 확인 완료 · {user.email}</div></div><ActionButton asChild size="small" variant="neutralWeak"><a href={chatGPTSignOutPath("/")}>로그아웃</a></ActionButton></div>
      {dashboard && <><div className="ff-dashboard-grid"><div><strong>{dashboard.favorites}</strong><span>관심 친구</span></div><div><strong>{dashboard.applications.length}</strong><span>입양 신청</span></div><div><strong>{dashboard.posts}</strong><span>나의 이야기</span></div><div><strong>{dashboard.reports}</strong><span>실종·발견</span></div></div>
        <section className="ff-section"><div className="ff-section-head"><h2 className="ff-section-title">입양 준비</h2><a className="ff-more" href="/readiness">다시 확인</a></div>{dashboard.readiness ? <div className="ff-readiness-summary"><div><span>생활 준비도</span><strong>{dashboard.readiness.readinessScore}</strong></div><div><span>필수 시험</span><strong>{dashboard.readiness.educationScore}</strong></div><Badge tone={dashboard.readiness.passed ? "positive" : "warning"} variant="weak">{dashboard.readiness.passed ? "교육 완료" : "재학습 필요"}</Badge></div> : <Callout tone="warning" title="아직 준비 시험을 완료하지 않았어요" description="입양 신청 전에 생활 환경·비용·필수 교육을 확인해 주세요." linkProps={{ href: "/readiness", children: "시험 시작" }}/>}</section>
        <section className="ff-section"><h2 className="ff-section-title" style={{ marginBottom: 10 }}>진행 중인 입양</h2>{dashboard.applications.length ? <List>{dashboard.applications.slice(0, 5).map((application, index) => <div key={application.id}><ListLinkItem href={`/applications/${application.id}`} prefix={<IconPawprintLine/>} title={`신청 #${application.id}`} detail={`준비도 ${application.readinessScore}점 · ${statusLabel[application.status] || application.status}`} suffix={<IconChevronRightLine/>}/>{index < Math.min(4, dashboard.applications.length - 1) && <ListDivider/>}</div>)}</List> : <div className="ff-empty">진행 중인 입양 신청이 없어요.</div>}</section>
      </>}
    </>}
    <div className="ff-divider"/>
    <section className="ff-section"><h2 className="ff-section-title" style={{ marginBottom: 10 }}>나의 활동</h2><List><ListLinkItem href="/find" prefix={<IconHeartLine/>} title="관심 친구와 저장 검색" detail={dashboard ? `${dashboard.favorites}마리 · 알림 조건 ${dashboard.searches}개` : undefined} suffix={<IconChevronRightLine/>}/><ListDivider/><ListLinkItem href="/notifications" prefix={<IconArticleLine/>} title="알림함" detail={dashboard ? `읽지 않은 알림 ${dashboard.unread}개` : undefined} suffix={<IconChevronRightLine/>}/><ListDivider/><ListLinkItem href="/readiness" prefix={<IconCheckmarkShieldFill/>} title="입양 준비 시험과 교육" suffix={<IconChevronRightLine/>}/><ListDivider/><ListLinkItem href="/stories/new" prefix={<IconArticleLine/>} title="나의 공개 이야기" suffix={<IconChevronRightLine/>}/><ListDivider/><ListLinkItem href={dashboard?.reports ? "/lost-found?mine=1" : "/lost-found"} prefix={<IconMagnifyingglassLine/>} title="실종·발견 신고와 알림" detail={dashboard ? `${dashboard.reports}건 등록 · 접수 뒤 연결 페이지에서 관리` : undefined} suffix={<IconChevronRightLine/>}/><ListDivider/><ListLinkItem href="/foster" prefix={<IconHousePlusLine/>} title="임시보호 동물 직접 등록" detail={dashboard ? `${dashboard.registrations}건 등록` : undefined} suffix={<IconChevronRightLine/>}/><ListDivider/><ListLinkItem href="/verification" prefix={<IconPersonShieldLine/>} title="임시보호자·보호단체 역할 인증" suffix={<IconChevronRightLine/>}/><ListDivider/><ListLinkItem href="/operations" prefix={<IconGearLine/>} title="보호처 운영 콘솔" detail="권한이 없으면 데모로 열립니다" suffix={<IconChevronRightLine/>}/></List></section>
    <section className="ff-section"><Callout tone="informative" title="도움과 운영 기록" description="운영 후원·굿즈·물품 지원은 목적과 전달 결과를 분리해 투명하게 기록하는 방식으로 순차적으로 열립니다."/></section>
    <section className="ff-section"><h2 className="ff-section-title" style={{marginBottom:10}}>가족·상담·도움 관리</h2><div className="ff-service-grid"><a href="/mypage/favorites"><IconHeartLine/><strong>관심 친구</strong><span>찜한 친구 다시 보기</span></a><a href="/mypage/searches"><IconMagnifyingglassLine/><strong>검색 알림</strong><span>조건 켜기·끄기·삭제</span></a><a href="/mypage/family"><IconHeartLine/><strong>가족 상의</strong><span>함께 본 친구와 의견</span></a><a href="/mypage/messages"><IconArticleLine/><strong>메시지함</strong><span>입양 상담과 인계 기록</span></a><a href="/stories/manage"><IconArticleLine/><strong>글 관리</strong><span>수정·삭제·공유</span></a><a href="/mypage/help"><IconHousePlusLine/><strong>도움 기록</strong><span>후원·굿즈·물품 상태</span></a><a href="/shelters/manage"><IconGearLine/><strong>보호소 운영</strong><span>소식·봉사·필요 물품</span></a></div></section>
  </div>;
}
