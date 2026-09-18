"use client";
import { useEffect, useState } from "react";
import { LoginBottomSheet } from "./LoginSheet";

type Request = { returnTo: string; description?: string };

/** 앱 셸에 하나만 두는 로그인 시트. 카드 안의 버튼처럼 시트를 직접 품을 수 없는 곳은 `ff-login-request` 이벤트로 연다. */
export function LoginPrompt() {
  const [request, setRequest] = useState<Request | null>(null);
  useEffect(() => {
    const open = (event: Event) => { const detail = (event as CustomEvent<Request>).detail; if (detail?.returnTo) setRequest(detail); };
    window.addEventListener("ff-login-request", open);
    return () => window.removeEventListener("ff-login-request", open);
  }, []);
  if (!request) return null;
  return <LoginBottomSheet open onOpenChange={(open) => { if (!open) setRequest(null); }} returnTo={request.returnTo} title="퍼스트프렌드 로그인" description={request.description || "이 기능은 로그인 후 쓸 수 있어요"}/>;
}
