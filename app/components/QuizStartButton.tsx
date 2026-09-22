"use client";

import { useEffect, useState } from "react";
import { ActionButton } from "seed-design/ui/action-button";
import { BottomSheetBody, BottomSheetContent, BottomSheetFooter, BottomSheetRoot } from "seed-design/ui/bottom-sheet";
import { AuthForm } from "./AuthForm";

export function QuizStartButton({ signedIn, onStart, worldcup = false }: { signedIn: boolean; onStart: () => void; worldcup?: boolean }) {
  const [open, setOpen] = useState(false);
  const [returnTo, setReturnTo] = useState("");
  useEffect(() => {
    if (!signedIn) return;
    const url = new URL(window.location.href);
    if (url.searchParams.get("quiz_start") !== "1") return;
    url.searchParams.delete("quiz_start");
    window.history.replaceState(window.history.state, "", url.pathname + url.search + url.hash);
    onStart();
  }, [signedIn, onStart]);
  function start() {
    if (signedIn) return onStart();
    const url = new URL(window.location.href);
    url.searchParams.set("quiz_start", "1");
    setReturnTo(url.pathname + url.search + url.hash);
    setOpen(true);
  }
  return <>
    <ActionButton size="large" variant="brandSolid" className="ff-grow" onClick={start}>시작하기</ActionButton>
    <BottomSheetRoot open={open} onOpenChange={setOpen}>
      <BottomSheetContent title="로그인하고 기록을 남겨 보세요" description="결과를 저장할 수 있어요.">
        <BottomSheetBody className="ff-login-sheet-body"><AuthForm returnTo={returnTo} /></BottomSheetBody>
        <BottomSheetFooter>
          <ActionButton size="large" variant="neutralWeak" onClick={() => { setOpen(false); onStart(); }}>{worldcup ? "로그인 없이 시작하기" : "로그인 없이 풀기"}</ActionButton>
        </BottomSheetFooter>
      </BottomSheetContent>
    </BottomSheetRoot>
  </>;
}
