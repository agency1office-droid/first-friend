/* eslint-disable react-hooks/set-state-in-effect -- 최근 로그인 쿠키는 마운트 뒤에야 읽을 수 있습니다 */
"use client";
import Image from "next/image";
import { useEffect, useState } from "react";
import { Callout } from "seed-design/ui/callout";
import { LAST_LOGIN_COOKIE } from "../../lib/last-login";

// 심볼과 문구는 각 플랫폼의 로그인 버튼 디자인 가이드에서 내려받은 공식 에셋을 따릅니다.
const socialProviders = [
  { key: "kakao", label: "카카오로 시작하기", icon: "/logo-kakao.webp", width: 21, height: 20 },
  { key: "naver", label: "네이버로 시작하기", icon: "/logo-naver.webp", width: 21, height: 19 },
  { key: "google", label: "Google로 시작하기", icon: "/logo-google.svg", width: 20, height: 20 },
] as const;

export function AuthForm({ returnTo = "/mypage", oauthStatus = "", provider = "" }: { returnTo?: string; oauthStatus?: string; provider?: string }) {
  const [lastLogin, setLastLogin] = useState("");
  useEffect(() => {
    const match = document.cookie.match(new RegExp(`(?:^|;\\s*)${LAST_LOGIN_COOKIE}=([^;]+)`));
    setLastLogin(match ? decodeURIComponent(match[1]) : "");
  }, []);
  return <div className="ff-login-card">
    {oauthStatus === "unconfigured" && <Callout tone="warning" title={`${providerLabel(provider)} 로그인 준비 중`} description="이 로그인은 아직 준비 중이에요. 다른 방법으로 시작해 주세요."/>}
    {oauthStatus && oauthStatus !== "unconfigured" && <Callout tone="critical" description={oauthStatus === "cancelled" ? "로그인이 취소됐어요. 원할 때 다시 시작해 주세요." : oauthStatus === "state" ? "로그인 시간이 지났거나 요청을 확인하지 못했어요. 다시 시작해 주세요." : "로그인을 완료하지 못했어요. 잠시 후 다시 시도해 주세요."}/>}
    <div className="ff-social-login">
      {socialProviders.map(({ key, label, icon, width, height }) => <a className={`ff-social-button ff-social-${key}`} key={key} href={`/api/auth/oauth/${key}?return_to=${encodeURIComponent(returnTo)}`}>
        <Image className="ff-social-icon" src={icon} alt="" width={width} height={height} unoptimized/>{label}
        {lastLogin === key && <span className="ff-social-recent">최근에 로그인했어요</span>}
      </a>)}
    </div>
  </div>;
}

function providerLabel(value: string) { return value === "kakao" ? "카카오" : value === "naver" ? "네이버" : "Google"; }
