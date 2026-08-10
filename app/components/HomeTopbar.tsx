"use client";

import { useEffect, useState } from "react";
import { ActionButton } from "seed-design/ui/action-button";
import { BottomSheetBody,BottomSheetContent,BottomSheetRoot,BottomSheetTrigger } from "seed-design/ui/bottom-sheet";
import { TextField,TextFieldInput } from "seed-design/ui/text-field";
import { IconBellLine,IconChevronDownLine,IconChevronRightLine,IconHorizline3VerticalTightLine } from "@karrotmarket/react-monochrome-icon";
import { useAppFeedback } from "./AppFeedback";

const menu=[
  ["보호소 찾기","/shelters"],["입양 준비하기","/prepare"],["입양 절차 안내","/guide"],
  ["실종·발견","/lost-found"],["질문답변","/questions"],["후원·봉사","/support"],
];

export function HomeTopbar(){
  const[region,setRegion]=useState("지역 설정"),[draft,setDraft]=useState(""),[regionOpen,setRegionOpen]=useState(false),feedback=useAppFeedback();
  useEffect(()=>{async function hydrate(){await Promise.resolve();const local=window.localStorage.getItem("ff-home-region")||"";if(local){setRegion(local);setDraft(local)}const body=await fetch("/api/profile").then(response=>response.json()).catch(()=>({}));if(body.homeRegion){setRegion(body.homeRegion);setDraft(body.homeRegion);window.localStorage.setItem("ff-home-region",body.homeRegion)}}void hydrate()},[]);
  async function save(){const value=draft.trim().split(" ").slice(0,2).join(" ");if(value.length<2){feedback.error("시·군·구 또는 동네 이름을 입력해 주세요");return}setRegion(value);window.localStorage.setItem("ff-home-region",value);window.dispatchEvent(new CustomEvent("ff-region-change",{detail:value}));const response=await fetch("/api/profile",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({homeRegion:value})});feedback.success(response.ok?"내 지역을 저장했어요":"이 기기에 지역을 저장했어요");setRegionOpen(false)}
  return <header className="ff-topbar ff-home-topbar"><BottomSheetRoot open={regionOpen} onOpenChange={setRegionOpen}><BottomSheetTrigger asChild><button className="ff-home-region" type="button" aria-label={`현재 지역 ${region}, 지역 변경`}><span>{region}</span><IconChevronDownLine aria-hidden/></button></BottomSheetTrigger><BottomSheetContent title="내 지역 설정" description="정확한 주소 대신 시·군·구 또는 동네까지만 입력해요."><BottomSheetBody><div className="ff-home-region-form"><TextField label="활동 지역"><TextFieldInput value={draft} onChange={event=>setDraft(event.target.value)} placeholder="예: 서울 마포구"/></TextField><ActionButton onClick={save}>이 지역에서 찾기</ActionButton></div></BottomSheetBody></BottomSheetContent></BottomSheetRoot><div className="ff-top-actions"><BottomSheetRoot><BottomSheetTrigger asChild><button className="ff-icon-link" type="button" aria-label="전체 메뉴"><IconHorizline3VerticalTightLine aria-hidden/></button></BottomSheetTrigger><BottomSheetContent title="퍼스트 프렌드 메뉴" description="입양과 지역 동물 도움 기능을 찾아보세요."><BottomSheetBody><nav className="ff-home-menu" aria-label="전체 메뉴">{menu.map(([label,href])=><a href={href} key={href}><span>{label}</span><IconChevronRightLine aria-hidden/></a>)}</nav></BottomSheetBody></BottomSheetContent></BottomSheetRoot><a className="ff-icon-link" href="/notifications" aria-label="알림 확인"><IconBellLine aria-hidden/></a></div></header>
}
