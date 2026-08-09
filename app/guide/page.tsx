import type { Metadata } from "next";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "seed-design/ui/accordion";
import { Callout } from "seed-design/ui/callout";
import { List, ListDivider, ListLinkItem } from "seed-design/ui/list";
import { IconArticleLine, IconCheckmarkShieldFill, IconChevronRightLine, IconHospitalcrossBuildingLine, IconHousePlusLine, IconMagnifyingglassLine, IconPawprintLine } from "@karrotmarket/react-monochrome-icon";
export const metadata: Metadata = { title:"처음부터 끝까지 입양 안내" };
const journey = [
  ["1. 친구 찾기", "그림·사진·품종·털색·나이·성별·지역으로 전국 공공 보호동물을 찾고, 닮은 이유를 확인합니다."],
  ["2. 건강카드 확인", "공공데이터에 공개된 상태만 표시합니다. 성격·질환·접종처럼 확인되지 않은 내용은 추측하지 않습니다."],
  ["3. 준비도와 필수 시험", "주거 허용, 동거인, 부재 시간, 비용과 응급 계획을 점검하고 고양이·강아지별 교육 시험에서 80점 이상을 받습니다."],
  ["4. 입양 신청", "생활 환경과 일상·장기 부재·응급 돌봄 계획을 작성합니다. 준비도 점수만으로 자동 탈락시키지 않습니다."],
  ["5. 보호처 상담", "서비스 안의 기록 가능한 메시지로 먼저 상담하고, 공공 보호동물은 신청 뒤 공식 보호센터 연락처를 확인합니다."],
  ["6. 만남과 승인", "직접 방문을 우선하며 동물의 건강과 생활 정보를 다시 확인합니다. 승인 권한은 실제 보호처에 있습니다."],
  ["7. 전자 약정", "평생 돌봄·재판매 금지·파양 전 상담·학대 의심 신고 등 표준 약정에 서명합니다. 임의 벌금이나 사적 처벌은 두지 않습니다."],
  ["8. 안전 인계", "직접 방문, 검증 봉사자 동행, 전문 운송 중 선택하고 이동 교육 체크리스트와 양측 확인을 남깁니다."],
];
export default function GuidePage(){return <div className="ff-page"><header className="ff-page-header"><div className="ff-kicker">처음 만나는 가족을 위한 안내</div><h1 className="ff-title">찾는 순간부터<br/>안전한 인계까지</h1><p className="ff-subtitle">쉽게 만날 수 있지만 가볍게 결정하지 않도록, 필요한 준비를 순서대로 안내합니다.</p></header><section className="ff-section"><h2 className="ff-section-title">입양의 8단계</h2><Accordion multiple defaultValue={["step-0"]}>{journey.map(([title,description],index)=><AccordionItem value={`step-${index}`} key={title}><AccordionTrigger title={title}/><AccordionContent><p className="ff-description">{description}</p></AccordionContent></AccordionItem>)}</Accordion></section><section className="ff-section"><h2 className="ff-section-title" style={{marginBottom:10}}>상황별 서비스</h2><List><ListLinkItem href="/find" prefix={<IconPawprintLine/>} title="그림·사진·조건으로 친구 찾기" suffix={<IconChevronRightLine/>}/><ListDivider/><ListLinkItem href="/readiness" prefix={<IconCheckmarkShieldFill/>} title="생활 준비와 종별 필수 시험" suffix={<IconChevronRightLine/>}/><ListDivider/><ListLinkItem href="/lost-found" prefix={<IconMagnifyingglassLine/>} title="실종·발견 신고와 QR 전단지" suffix={<IconChevronRightLine/>}/><ListDivider/><ListLinkItem href="/shelters" prefix={<IconHospitalcrossBuildingLine/>} title="전국 공공 보호센터" suffix={<IconChevronRightLine/>}/><ListDivider/><ListLinkItem href="/foster" prefix={<IconHousePlusLine/>} title="임시보호자 교육과 직접 등록" suffix={<IconChevronRightLine/>}/><ListDivider/><ListLinkItem href="/stories" prefix={<IconArticleLine/>} title="입양·동네·추억·구조 이야기" suffix={<IconChevronRightLine/>}/></List></section><section className="ff-section"><Callout tone="informative" title="강제 사후 감시는 하지 않습니다" description="입양 후 게시나 정기 확인을 의무화하지 않습니다. 자발적인 이야기와 안전 신고를 분리해 운영합니다."/><div style={{height:10}}/><Callout tone="warning" title="위급한 상황은 공공기관이 우선입니다" description="학대·긴급 구조는 관할 지자체나 경찰에 먼저 신고하고, 서비스에는 증거 보존과 운영 신고를 남겨 주세요."/></section></div>}
