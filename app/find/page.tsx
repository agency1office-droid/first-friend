import type { Metadata } from "next";
import { getAnimalsWithPhotoCounts } from "../../lib/public-data";
import { NearbyAnimalFeed } from "../components/NearbyAnimalFeed";
import { IconCameraLine, IconChevronRightLine, IconPencilLine, IconSlider2HorizontalLine, IconTrophyLine } from "@karrotmarket/react-monochrome-icon";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "가족을 기다리는 친구" };
export default async function FindPage() {
  const animals = await getAnimalsWithPhotoCounts(30);
  return <div className="ff-page"><header className="ff-page-header"><div className="ff-kicker">국가동물보호정보시스템 연동</div><h1 className="ff-title">가까운 곳에서<br/>첫 친구를 만나보세요</h1><p className="ff-description">입양 매칭에는 기획 원칙대로 개와 고양이만 보여요. AI는 외형의 유사성만 비교하며 건강·성격·입양 성공을 판단하지 않아요. 다른 동물은 실종·발견에서 도울 수 있어요.</p></header>
    <section className="ff-search-entry-grid" aria-label="특별한 방법으로 찾기">
      <a href="/find/draw"><IconPencilLine/><span><strong>직접 그려서 찾기</strong><small>색·무늬·귀·눈·체형을 태그로 분석</small></span><IconChevronRightLine/></a>
      <a href="/find/photo"><IconCameraLine/><span><strong>사진으로 닮은 친구 찾기</strong><small>기기에서 분석하고 사진은 저장하지 않음</small></span><IconChevronRightLine/></a>
      <a href="/find/conditions"><IconSlider2HorizontalLine/><span><strong>조건으로 꼼꼼히 찾기</strong><small>품종·털색·나이·성별·지역 선택</small></span><IconChevronRightLine/></a>
      <a href="/find/worldcup"><IconTrophyLine/><span><strong>첫 친구 이상형 월드컵</strong><small>MBTI처럼 선택하고 내 취향 태그 발견</small></span><IconChevronRightLine/></a>
      <a href="/drawings"><IconPencilLine/><span><strong>그림 탐정단 게시판</strong><small>회원들이 닮은 보호동물을 함께 찾아요</small></span><IconChevronRightLine/></a>
    </section><div className="ff-divider"/><NearbyAnimalFeed animals={animals}/></div>;
}
