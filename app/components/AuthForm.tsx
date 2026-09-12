import Image from "next/image";
import { Callout } from "seed-design/ui/callout";

// 심볼과 문구는 각 플랫폼의 로그인 버튼 디자인 가이드를 따릅니다.
const socialProviders = [
  { key: "kakao", label: "카카오 로그인", icon: "/logo-kakao.webp", width: 19, height: 18 },
  { key: "naver", label: "네이버 로그인", icon: "/logo-naver.webp", width: 20, height: 18 },
  { key: "google", label: "Google로 로그인", icon: "/logo-google.svg", width: 18, height: 18 },
] as const;

export function AuthForm({ returnTo = "/mypage", oauthStatus = "", provider = "" }: { returnTo?: string; oauthStatus?: string; provider?: string }) {
  return <div className="ff-login-card">
    {oauthStatus === "unconfigured" && <Callout tone="warning" title={`${providerLabel(provider)} 로그인 준비 중`} description="이 로그인은 아직 준비 중이에요. 다른 방법으로 시작해 주세요."/>}
    {oauthStatus && oauthStatus !== "unconfigured" && <Callout tone="critical" description={oauthStatus === "cancelled" ? "로그인이 취소됐어요. 원할 때 다시 시작해 주세요." : oauthStatus === "state" ? "로그인 시간이 지났거나 요청을 확인하지 못했어요. 다시 시작해 주세요." : "로그인을 완료하지 못했어요. 잠시 후 다시 시도해 주세요."}/>}
    <div className="ff-social-login">
      {socialProviders.map(({ key, label, icon, width, height }) => <a className={`ff-social-button ff-social-${key}`} key={key} href={`/api/auth/oauth/${key}?return_to=${encodeURIComponent(returnTo)}`}><Image className="ff-social-icon" src={icon} alt="" width={width} height={height} unoptimized/>{label}</a>)}
    </div>
  </div>;
}

function providerLabel(value: string) { return value === "kakao" ? "카카오" : value === "naver" ? "네이버" : "Google"; }
