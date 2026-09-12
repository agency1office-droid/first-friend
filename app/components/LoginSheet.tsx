"use client";
import Image from "next/image";
import { useState } from "react";
import { ActionButton } from "seed-design/ui/action-button";
import { BottomSheetBody, BottomSheetContent, BottomSheetRoot } from "seed-design/ui/bottom-sheet";
import { AuthForm } from "./AuthForm";

export function LoginSheet({ returnTo, prompt, title, description }: { returnTo: string; prompt: string; title: string; description: string }) {
  const [open, setOpen] = useState(true);
  return <>
    <div className="ff-login-prompt">
      <Image className="ff-login-prompt-illust" src="/illust-welcome.webp" alt="" width={233} height={200} priority unoptimized/>
      <strong>{prompt}</strong>
      <ActionButton size="large" onClick={() => setOpen(true)}>로그인</ActionButton>
    </div>
    <BottomSheetRoot open={open} onOpenChange={setOpen}>
      <BottomSheetContent title={title} description={description}>
        <BottomSheetBody className="ff-login-sheet-body"><AuthForm returnTo={returnTo}/></BottomSheetBody>
      </BottomSheetContent>
    </BottomSheetRoot>
  </>;
}
