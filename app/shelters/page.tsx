import type { Metadata } from "next";
import { getShelters } from "../../lib/public-data";
import { Callout } from "seed-design/ui/callout";
import { List, ListDivider, ListLinkItem } from "seed-design/ui/list";
import { IconChevronRightLine, IconHospitalcrossBuildingLine } from "@karrotmarket/react-monochrome-icon";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "전국 보호센터" };

export default async function SheltersPage() {
  const shelters = await getShelters(30);
  return <div className="ff-page">
    <header className="ff-page-header"><div className="ff-kicker">동물보호센터 공공데이터</div><h1 className="ff-title">전국 보호센터를<br/>확인하세요</h1><p className="ff-description">운영시간과 보호 대상은 바뀔 수 있으니 방문 전에 전화로 확인해 주세요.</p></header>
    <Callout tone="warning" description="긴급한 구조·학대 상황은 관할 지자체나 경찰에 먼저 연락해 주세요."/>
    <section className="ff-section">
      {shelters.length ? <List>{shelters.map((shelter, index) => <div key={shelter.id}><ListLinkItem href={`/shelters/${encodeURIComponent(shelter.id)}`} prefix={<IconHospitalcrossBuildingLine/>} title={shelter.name} detail={`${shelter.organization} · ${shelter.animals}\n${shelter.address.split(" ").slice(0,2).join(" ")}\n평일 ${shelter.hours} · ${shelter.closed}`} suffix={<IconChevronRightLine/>}/>{index < shelters.length - 1 && <ListDivider/>}</div>)}</List> : <div className="ff-empty">보호센터 정보를 불러오지 못했어요. 잠시 후 다시 확인해 주세요.</div>}
    </section>
  </div>;
}
