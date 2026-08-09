"use client";
import { useMemo, useState } from "react";
import { catCosts, dogCosts } from "../../lib/care-content";
import { SegmentedControl, SegmentedControlItem } from "seed-design/ui/segmented-control";
import { Slider } from "seed-design/ui/slider";
import { Callout } from "seed-design/ui/callout";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "seed-design/ui/accordion";

const money = (value:number) => `${Math.round(value / 10000).toLocaleString("ko-KR")}만원`;
export function CostPlanner(){
  const [species,setSpecies]=useState<"cat"|"dog">("cat"),[quality,setQuality]=useState(45),[pets,setPets]=useState(1);
  const items=species==="cat"?catCosts:dogCosts;
  const sums=useMemo(()=>Object.fromEntries(["처음","매달","매년","비상"].map(cadence=>{const rows=items.filter(i=>i.cadence===cadence);const ratio=quality/100;return [cadence,rows.reduce((s,i)=>s+i.low+(i.high-i.low)*ratio,0)*pets]})),[items,quality,pets]);
  return <div className="ff-cost-planner"><SegmentedControl aria-label="동물 종류" value={species} onValueChange={v=>setSpecies(v as "cat"|"dog")}><SegmentedControlItem value="cat">고양이</SegmentedControlItem><SegmentedControlItem value="dog">강아지</SegmentedControlItem></SegmentedControl>
    <div className="ff-cost-controls"><div><Slider label="생활비 여유 수준" indicator={quality<34?"기본":quality<67?"균형":"여유"} min={0} max={100} values={[quality]} onValueChange={v=>setQuality(v[0])}/></div><label>함께할 동물 수 <select className="ff-native-select" value={pets} onChange={e=>setPets(Number(e.target.value))}><option value="1">1마리</option><option value="2">2마리</option><option value="3">3마리</option></select></label></div>
    <div className="ff-cost-summary"><div><span>초기 준비</span><strong>{money(sums["처음"])}</strong></div><div><span>예상 월 생활비</span><strong>{money(sums["매달"])}</strong></div><div><span>연간 정기 진료</span><strong>{money(sums["매년"])}</strong></div><div><span>권장 비상자금</span><strong>{money(sums["비상"])}</strong></div></div>
    <Callout tone="warning" title="가격표가 아니라 준비 범위예요" description="지역·병원·체중·질환·제품 선택에 따라 크게 달라집니다. 병원비와 응급비는 실제 진료 전 확정할 수 없어요."/>
    <Accordion multiple>{items.map(item=><AccordionItem value={`${item.cadence}-${item.name}`} key={`${item.cadence}-${item.name}`}><AccordionTrigger title={item.name} description={`${item.cadence} · ${money(item.low)}~${money(item.high)}`}/><AccordionContent>{item.note}</AccordionContent></AccordionItem>)}</Accordion>
  </div>;
}
