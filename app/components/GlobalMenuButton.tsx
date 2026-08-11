"use client";

import { IconChevronRightLine, IconHorizline3VerticalTightLine } from "@karrotmarket/react-monochrome-icon";
import { BottomSheetBody, BottomSheetContent, BottomSheetRoot, BottomSheetTrigger } from "seed-design/ui/bottom-sheet";

const menu = [
  ["보호소 찾기", "/shelters"], ["입양 준비하기", "/prepare"], ["입양 절차 안내", "/guide"],
  ["실종·발견", "/lost-found"], ["질문답변", "/questions"], ["후원·봉사", "/support"],
  ["퍼스트 프렌드", "/about"],
];

export function GlobalMenuButton() {
  return <BottomSheetRoot>
    <BottomSheetTrigger asChild>
      <button className="ff-icon-link" type="button" aria-label="전체 메뉴"><IconHorizline3VerticalTightLine aria-hidden /></button>
    </BottomSheetTrigger>
    <BottomSheetContent title="퍼스트 프렌드 메뉴" description="입양과 지역 동물 도움 기능을 찾아보세요.">
      <BottomSheetBody><nav className="ff-home-menu" aria-label="전체 메뉴">
        {menu.map(([label, href]) => <a href={href} key={href}><span>{label}</span><IconChevronRightLine aria-hidden /></a>)}
      </nav></BottomSheetBody>
    </BottomSheetContent>
  </BottomSheetRoot>;
}
