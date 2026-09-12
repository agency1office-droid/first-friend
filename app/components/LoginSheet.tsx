"use client";
import { useState } from "react";
import { ActionButton } from "seed-design/ui/action-button";
import { BottomSheetBody, BottomSheetContent, BottomSheetRoot } from "seed-design/ui/bottom-sheet";
import { AuthForm } from "./AuthForm";

export function LoginSheet({ returnTo, title, description }: { returnTo: string; title: string; description: string }) {
  const [open, setOpen] = useState(true);
  return <>
    <div className="ff-login-prompt">
      <strong>{title}</strong>
      <p>{description}</p>
      <ActionButton size="large" onClick={() => setOpen(true)}>로그인</ActionButton>
    </div>
    <BottomSheetRoot open={open} onOpenChange={setOpen}>
      <BottomSheetContent title={title} description={description}>
        <BottomSheetBody className="ff-login-sheet-body"><AuthForm returnTo={returnTo}/></BottomSheetBody>
      </BottomSheetContent>
    </BottomSheetRoot>
  </>;
}
