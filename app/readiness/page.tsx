import type { Metadata } from "next";
import { ReadinessQuiz } from "../components/ReadinessQuiz";
import { Callout } from "seed-design/ui/callout";
import { List, ListDivider, ListItem } from "seed-design/ui/list";
import { IconCheckmarkShieldFill, IconWonCircleLine, IconGraduationcapLine } from "@karrotmarket/react-monochrome-icon";

export const metadata: Metadata = { title: "입양 준비 시험" };

export default function ReadinessPage() {
  return <div className="ff-page">
    <header className="ff-page-header"><div className="ff-kicker">입양 전 필수 과정</div><h1 className="ff-title">내가 평생 돌볼 준비가<br/>되어 있는지 확인해요</h1><p className="ff-description">고양이·강아지별 생활 환경, 비용, 안전 지식을 차근차근 확인합니다. 사람을 줄 세우는 시험이 아니라 부족한 준비를 발견하는 과정이에요.</p></header>
    <List><ListItem prefix={<IconCheckmarkShieldFill/>} title="생활 환경 준비도" detail="주거·시간·동거인·안전장치를 확인해요."/><ListDivider/><ListItem prefix={<IconWonCircleLine/>} title="현실적인 비용 계획" detail="월 비용·초기 비용·비상 진료비를 범위로 살펴봐요."/><ListDivider/><ListItem prefix={<IconGraduationcapLine/>} title="종별 필수 교육과 시험" detail="10문항 중 8문항 이상이면 신청에 사용할 수 있어요."/></List>
    <div className="ff-divider"/>
    <section className="ff-section"><ReadinessQuiz/></section>
    <section className="ff-section"><Callout tone="neutral" title="최종 입양 결정은 보호자가 합니다" description="준비도와 시험 결과는 상담 참고 정보입니다. 원룸, 직장 생활, 초보 보호자라는 이유만으로 자동 탈락하지 않습니다."/></section>
  </div>;
}
