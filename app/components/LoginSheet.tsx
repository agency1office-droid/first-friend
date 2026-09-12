"use client";
import Image from "next/image";
import { useState } from "react";
import { ActionButton } from "seed-design/ui/action-button";
import { BottomSheetBody, BottomSheetContent, BottomSheetRoot } from "seed-design/ui/bottom-sheet";
import { AuthForm } from "./AuthForm";

type SheetProps = { returnTo: string; title: string; description: string };

/** 화면을 떠나지 않고 여는 로그인 바텀 시트. 열림 상태는 부모가 가진다. */
export function LoginBottomSheet({ open, onOpenChange, returnTo, title, description }: SheetProps & { open: boolean; onOpenChange: (open: boolean) => void }) {
  return <BottomSheetRoot open={open} onOpenChange={onOpenChange}>
    <BottomSheetContent title={title} description={description}>
      <BottomSheetBody className="ff-login-sheet-body"><AuthForm returnTo={returnTo}/></BottomSheetBody>
    </BottomSheetContent>
  </BottomSheetRoot>;
}

export function LoginSheet({ returnTo, prompt, title, description }: SheetProps & { prompt: string }) {
  const [open, setOpen] = useState(true);
  return <>
    <div className="ff-login-prompt" data-sheet-open={open || undefined}>
      <Image className="ff-login-illust" src="/illust-welcome.webp" alt="" width={233} height={200} priority unoptimized/>
      <p className="ff-login-text">{prompt}</p>
      <ActionButton size="large" onClick={() => setOpen(true)}>로그인</ActionButton>
    </div>
    <LoginBottomSheet open={open} onOpenChange={setOpen} returnTo={returnTo} title={title} description={description}/>
  </>;
}
