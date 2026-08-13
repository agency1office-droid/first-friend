import { createSession, findOrCreateSocialMember, isLocalRequest, randomToken, safeReturnTo, sessionCookie } from "../../../../../lib/app-auth";

type Provider = "google" | "kakao" | "naver";
const configs: Record<Provider, { client: string; authorize: string; scope: string }> = {
  google: { client: "GOOGLE_OAUTH_CLIENT_ID", authorize: "https://accounts.google.com/o/oauth2/v2/auth", scope: "openid email profile" },
  kakao: { client: "KAKAO_OAUTH_CLIENT_ID", authorize: "https://kauth.kakao.com/oauth/authorize", scope: "profile_nickname account_email" },
  naver: { client: "NAVER_OAUTH_CLIENT_ID", authorize: "https://nid.naver.com/oauth2.0/authorize", scope: "" },
};

export async function GET(request: Request, { params }: { params: Promise<{ provider: string }> }) {
  const provider = (await params).provider as Provider, config = configs[provider];
  if (!config) return Response.json({ error: "지원하지 않는 로그인입니다." }, { status: 404 });
  const returnTo = safeReturnTo(new URL(request.url).searchParams.get("return_to"));
  // LOCAL TEST AUTH: localhost에서만 카카오 버튼을 가입된 테스트 회원 세션으로 연결한다.
  // 배포 도메인에서는 이 분기가 실행되지 않으며 반드시 실제 카카오 OAuth를 사용한다.
  if (provider === "kakao" && isLocalRequest(request)) {
    const member = await findOrCreateSocialMember(undefined, "kakao", "first-friend-local-kakao-member", "kakao.test@first-friend.local", "카카오 테스트 회원");
    if (!member) return Response.redirect(new URL("/login?oauth=failed", request.url));
    const session = await createSession(undefined, member.id);
    return new Response(null, { status: 302, headers: { location: new URL(returnTo, request.url).toString(), "set-cookie": sessionCookie(session.token, undefined, false) } });
  }
  const clientId = process.env[config.client];
  if (!clientId) return Response.redirect(new URL(`/login?oauth=unconfigured&provider=${provider}`, request.url));
  const state = randomToken(20);
  const callback = `${new URL(request.url).origin}/api/auth/oauth/${provider}/callback`;
  const url = new URL(config.authorize); url.searchParams.set("response_type", "code"); url.searchParams.set("client_id", clientId); url.searchParams.set("redirect_uri", callback); url.searchParams.set("state", state); if (config.scope) url.searchParams.set("scope", config.scope); if (provider === "google") url.searchParams.set("access_type", "online");
  const cookie = [`ff_oauth_state=${state}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=600`, `ff_oauth_return=${encodeURIComponent(returnTo)}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=600`].join(", ");
  return new Response(null, { status: 302, headers: { location: url.toString(), "set-cookie": cookie } });
}
