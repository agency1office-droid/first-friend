"use client";

import { BottomSheetBody,BottomSheetContent,BottomSheetRoot,BottomSheetTrigger } from "seed-design/ui/bottom-sheet";
import { IconCameraLine,IconChevronRightLine,IconMagnifyingglassLine,IconPencilLine,IconSlider2HorizontalLine,IconTrophyLine } from "@karrotmarket/react-monochrome-icon";

const choices=[
  {href:"/find/conditions",title:"조건으로 찾기",description:"품종·털색·나이·지역을 직접 선택",Icon:IconSlider2HorizontalLine},
  {href:"/find/draw",title:"그려서 찾기",description:"그림의 색과 생김새를 태그로 연결",Icon:IconPencilLine},
  {href:"/find/photo",title:"사진으로 찾기",description:"사진 특징과 닮은 보호동물 찾기",Icon:IconCameraLine},
  {href:"/find/worldcup",title:"첫 친구 이상형 월드컵",description:"선택하면서 나의 취향 발견",Icon:IconTrophyLine},
  {href:"/drawings",title:"그림 탐정 게시판",description:"사람들과 함께 그림 속 친구 찾기",Icon:IconPencilLine},
];

export function HomeSearchFab(){return <BottomSheetRoot><BottomSheetTrigger asChild><button className="ff-home-search-fab" type="button" aria-label="다른 방법으로 친구 찾기"><IconMagnifyingglassLine aria-hidden/></button></BottomSheetTrigger><BottomSheetContent title="어떤 방법으로 찾아볼까요?" description="조건, 그림, 사진 또는 취향 선택으로 첫 친구를 발견해 보세요."><BottomSheetBody><nav className="ff-home-search-menu" aria-label="친구 찾기 방법">{choices.map(({href,title,description,Icon})=><a href={href} key={href}><span className="ff-home-search-icon"><Icon aria-hidden/></span><span><strong>{title}</strong><small>{description}</small></span><IconChevronRightLine aria-hidden/></a>)}</nav></BottomSheetBody></BottomSheetContent></BottomSheetRoot>}
