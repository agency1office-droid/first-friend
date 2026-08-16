"use client";
import { useMemo, useState } from "react";
import { catCosts, dogCosts, type CostItem } from "../../lib/care-content";
import { SegmentedControl, SegmentedControlItem } from "seed-design/ui/segmented-control";
import { Slider } from "seed-design/ui/slider";
import { Callout } from "seed-design/ui/callout";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "seed-design/ui/accordion";
import { QuantityPicker } from "seed-design/ui/quantity-picker";

const money = (value:number) => `${Math.round(value / 10000).toLocaleString("ko-KR")}만원`;
const clamp = (value:number, min:number, max:number) => Math.min(max, Math.max(min, Number.isFinite(value) ? value : min));
export function CostPlanner({ initialSpecies = "cat" }: { initialSpecies?: "cat" | "dog" }){
  const [species,setSpecies]=useState<"cat"|"dog">(initialSpecies),[quality,setQuality]=useState(45),[pets,setPets]=useState(1);
  const items=species==="cat"?catCosts:dogCosts;
  const totals=useMemo(()=>{
    const safeQuality=clamp(Number(quality),0,100)/100;
    const safePets=clamp(Math.floor(Number(pets)),1,3);
    const estimate=(cadence:CostItem["cadence"])=>items.filter(item=>item.cadence===cadence).reduce((sum,item)=>sum+item.low+(item.high-item.low)*safeQuality,0)*safePets;
    const monthly=estimate("매달");
    const annualRoutine=monthly*12+estimate("매년");
    const initial=estimate("처음");
    return { initial, monthly, annualRoutine, firstYear:initial+annualRoutine, emergency:estimate("비상") };
  },[items,quality,pets]);
  return <div className="ff-cost-planner"><SegmentedControl aria-label="동물 종류" value={species} onValueChange={v=>setSpecies(v as "cat"|"dog")}><SegmentedControlItem value="cat">고양이</SegmentedControlItem><SegmentedControlItem value="dog">강아지</SegmentedControlItem></SegmentedControl>
    <div className="ff-cost-controls"><div><Slider label="제품·돌봄 선택 수준" indicator={quality<34?"기본":quality<67?"균형":"여유"} min={0} max={100} values={[clamp(quality,0,100)]} onValueChange={v=>setQuality(clamp(Number(v[0]),0,100))}/></div><div className="ff-quantity-row"><strong>함께할 동물 수</strong><QuantityPicker value={clamp(Math.floor(pets),1,3)} min={1} max={3} onValueChange={value=>setPets(clamp(Math.floor(Number(value)),1,3))} getValueText={(_,value)=>`${value}마리`}/></div></div>
    <div className="ff-cost-summary"><div><span>처음 준비할 비용</span><strong>{money(totals.initial)}</strong><small>용품·중성화</small></div><div><span>예상 월 생활비</span><strong>{money(totals.monthly)}</strong><small>식비·소모품 등</small></div><div><span>1년 반복 비용</span><strong>{money(totals.annualRoutine)}</strong><small>월 비용·정기 진료</small></div><div><span>첫해 예상 비용</span><strong>{money(totals.firstYear)}</strong><small>처음 준비 포함</small></div><div><span>응급 예비자금</span><strong>{money(totals.emergency)}</strong><small>월 비용과 별도</small></div></div>
    <Callout tone="warning" title="결정 전 예산을 확인하는 참고 범위예요" description="국내 공개 진료비와 일반적인 양육 항목을 바탕으로 계산하지만, 지역·병원·체중·질환·제품 선택에 따라 달라져요. 응급 예비자금은 예상 청구액이 아니라 별도로 준비할 금액이에요."/>
    <Accordion multiple>{items.map(item=><AccordionItem value={`${item.cadence}-${item.name}`} key={`${item.cadence}-${item.name}`}><AccordionTrigger title={item.name} description={`${item.cadence} · ${money(item.low)}~${money(item.high)}`}/><AccordionContent>{item.note}</AccordionContent></AccordionItem>)}</Accordion>
  </div>;
}
