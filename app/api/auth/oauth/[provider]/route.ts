import { randomToken, safeReturnTo } from "../../../../../lib/app-auth";

type Provider = "google" | "kakao" | "naver";
const configs: Record<Provider, { client: string; authorize: string; scope: string }> = {
  google: { client: "GOOGLE_OAUTH_CLIENT_ID", authorize: "https://accounts.google.com/o/oauth2/v2/auth", scope: "openid email profile" },
  kakao: { client: "KAKAO_OAUTH_CLIENT_ID", authorize: "https://kauth.kakao.com/oauth/authorize", scope: "profile_nickname account_email" },
  naver: { client: "NAVER_OAUTH_CLIENT_ID", authorize: "https://nid.naver.com/oauth2.0/authorize", scope: "" },
};

export async function GET(request: Request, { params }: { params: Promise<{ provider: string }> }) {
  const provider = (await params).provider as Provider, config = configs[provider];
  if (!config) return Response.json({ error: "지원하지 않는 로그인입니다." }, { status: 404 });
  const clientId = process.env[config.client];
  if (!clientId) return Response.redirect(new URL(`/login?oauth=unconfigured&provider=${provider}`, request.url));
  const state = randomToken(20), returnTo = safeReturnTo(new URL(request.url).searchParams.get("return_to"));
  const callback = `${new URL(request.url).origin}/api/auth/oauth/${provider}/callback`;
  const url = new URL(config.authorize); url.searchParams.set("response_type", "code"); url.searchParams.set("client_id", clientId); url.searchParams.set("redirect_uri", callback); url.searchParams.set("state", state); if (config.scope) url.searchParams.set("scope", config.scope); if (provider === "google") url.searchParams.set("access_type", "online");
  const cookie = [`ff_oauth_state=${state}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=600`, `ff_oauth_return=${encodeURIComponent(returnTo)}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=600`].join(", ");
  return new Response(null, { status: 302, headers: { location: url.toString(), "set-cookie": cookie } });
}
