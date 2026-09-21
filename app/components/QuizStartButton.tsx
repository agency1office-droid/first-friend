"use client";

import { useEffect, useState } from "react";
import { ContentDialog, Portal } from "@seed-design/react";
import { ActionButton } from "seed-design/ui/action-button";
import { LoginBottomSheet } from "./LoginSheet";
import styles from "./QuizStartButton.module.css";

export function QuizStartButton({ signedIn, onStart, worldcup = false }: { signedIn: boolean; onStart: () => void; worldcup?: boolean }) {
  const [open, setOpen] = useState(false);
  const [returnTo, setReturnTo] = useState("");
  const [loginOpen, setLoginOpen] = useState(false);
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
    <ContentDialog.Root open={open} onOpenChange={setOpen}>
      <Portal>
      <ContentDialog.Positioner>
        <ContentDialog.Backdrop className={styles.backdrop} />
        <ContentDialog.Content className={styles.content}>
          <ContentDialog.Header>
            <ContentDialog.Title>로그인하고 기록을 남겨 보세요</ContentDialog.Title>
            <ContentDialog.Description>기록을 저장할 수 있어요.</ContentDialog.Description>
          </ContentDialog.Header>
          <ContentDialog.Footer className={styles.actions}>
            <ActionButton size="large" variant="brandSolid" onClick={() => { setOpen(false); setLoginOpen(true); }}>로그인</ActionButton>
            <ActionButton size="large" variant="neutralWeak" onClick={() => { setOpen(false); onStart(); }}>{worldcup ? "그냥 시작하기" : "그냥 풀기"}</ActionButton>
          </ContentDialog.Footer>
        </ContentDialog.Content>
      </ContentDialog.Positioner>
      </Portal>
    </ContentDialog.Root>
    <LoginBottomSheet open={loginOpen} onOpenChange={setLoginOpen} returnTo={returnTo} title="로그인" description="기록을 저장할 수 있어요." />
  </>;
}
