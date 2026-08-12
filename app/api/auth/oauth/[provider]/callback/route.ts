import { createSession, findOrCreateSocialMember, safeReturnTo, sessionCookie } from "../../../../../../lib/app-auth";

type Provider = "google" | "kakao" | "naver";
const providers = {
  google: { client: "GOOGLE_OAUTH_CLIENT_ID", secret: "GOOGLE_OAUTH_CLIENT_SECRET", token: "https://oauth2.googleapis.com/token", user: "https://openidconnect.googleapis.com/v1/userinfo" },
  kakao: { client: "KAKAO_OAUTH_CLIENT_ID", secret: "KAKAO_OAUTH_CLIENT_SECRET", token: "https://kauth.kakao.com/oauth/token", user: "https://kapi.kakao.com/v2/user/me" },
  naver: { client: "NAVER_OAUTH_CLIENT_ID", secret: "NAVER_OAUTH_CLIENT_SECRET", token: "https://nid.naver.com/oauth2.0/token", user: "https://openapi.naver.com/v1/nid/me" },
} satisfies Record<Provider, Record<string, string>>;

export async function GET(request: Request, { params }: { params: Promise<{ provider: string }> }) {
  const provider = (await params).provider as Provider, config = providers[provider];
  if (!config) return Response.redirect(new URL("/login?oauth=failed", request.url));
  const url = new URL(request.url), code = url.searchParams.get("code"), state = url.searchParams.get("state"), cookie = request.headers.get("cookie") || "";
  const expected = cookie.match(/(?:^|;\s*)ff_oauth_state=([^;]+)/)?.[1], rawReturn = cookie.match(/(?:^|;\s*)ff_oauth_return=([^;]+)/)?.[1];
  if (!code || !state || state !== expected) return Response.redirect(new URL("/login?oauth=state", request.url));
  const clientId = process.env[config.client], clientSecret = process.env[config.secret];
  if (!clientId || !clientSecret) return Response.redirect(new URL(`/login?oauth=unconfigured&provider=${provider}`, request.url));
  const callback = `${url.origin}/api/auth/oauth/${provider}/callback`;
  const body = new URLSearchParams({ grant_type: "authorization_code", client_id: clientId, client_secret: clientSecret, redirect_uri: callback, code, state });
  const tokenResponse = await fetch(config.token, { method: "POST", headers: { "content-type": "application/x-www-form-urlencoded" }, body });
  const token = await tokenResponse.json() as { access_token?: string };
  if (!token.access_token) return Response.redirect(new URL("/login?oauth=failed", request.url));
  const profileResponse = await fetch(config.user, { headers: { authorization: `Bearer ${token.access_token}` } });
  const profile = await profileResponse.json() as Record<string, unknown>;
  const record = (value: unknown) => value && typeof value === "object" ? value as Record<string, unknown> : {};
  const kakaoAccount = record(profile.kakao_account), kakaoProfile = record(kakaoAccount.profile), properties = record(profile.properties), naver = record(profile.response);
  const normalized = provider === "google" ? { id: String(profile.sub), email: String(profile.email || ""), name: String(profile.name || "") } : provider === "kakao" ? { id: String(profile.id), email: String(kakaoAccount.email || ""), name: String(properties.nickname || kakaoProfile.nickname || "") } : { id: String(naver.id), email: String(naver.email || ""), name: String(naver.name || naver.nickname || "") };
  if (!normalized.id || normalized.id === "undefined") return Response.redirect(new URL("/login?oauth=failed", request.url));
  const member = await findOrCreateSocialMember(undefined, provider, normalized.id, normalized.email, normalized.name);
  if (!member) return Response.redirect(new URL("/login?oauth=failed", request.url));
  const session = await createSession(undefined, member.id), returnTo = safeReturnTo(rawReturn ? decodeURIComponent(rawReturn) : "/mypage");
  return new Response(null, { status: 302, headers: { location: new URL(returnTo, request.url).toString(), "set-cookie": sessionCookie(session.token) } });
}
