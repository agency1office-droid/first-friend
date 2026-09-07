import { isLocalRequest, safeReturnTo } from "./app-auth";

export const oauthProviders = {
  google: { client: "GOOGLE_OAUTH_CLIENT_ID", secret: "GOOGLE_OAUTH_CLIENT_SECRET", authorize: "https://accounts.google.com/o/oauth2/v2/auth", scope: "openid email profile", token: "https://oauth2.googleapis.com/token", user: "https://openidconnect.googleapis.com/v1/userinfo" },
  kakao: { client: "KAKAO_OAUTH_CLIENT_ID", secret: "KAKAO_OAUTH_CLIENT_SECRET", authorize: "https://kauth.kakao.com/oauth/authorize", scope: "profile_nickname", token: "https://kauth.kakao.com/oauth/token", user: "https://kapi.kakao.com/v2/user/me" },
  naver: { client: "NAVER_OAUTH_CLIENT_ID", secret: "NAVER_OAUTH_CLIENT_SECRET", authorize: "https://nid.naver.com/oauth2.0/authorize", scope: "", token: "https://nid.naver.com/oauth2.0/token", user: "https://openapi.naver.com/v1/nid/me" },
} as const;
export type OAuthProvider = keyof typeof oauthProviders;

export function isOAuthProvider(value: string): value is OAuthProvider {
  return Object.hasOwn(oauthProviders, value);
}

export function oauthOrigin(request: Request) {
  const url = new URL(request.url);
  if (isLocalRequest(request)) return "http://localhost:3000";
  if (["www.firstfriend.me", "firstfriend.me", "first-friend.vercel.app"].includes(url.hostname)) return "https://www.firstfriend.me";
  throw new Error("Unsupported OAuth origin");
}

export function oauthCookie(request: Request, provider: OAuthProvider, name: "state" | "return", value: string, maxAge = 600) {
  return `ff_oauth_${provider}_${name}=${encodeURIComponent(value)}; Path=/api/auth/oauth/${provider}; HttpOnly; ${isLocalRequest(request) ? "" : "Secure; "}SameSite=Lax; Max-Age=${maxAge}`;
}

export function readOAuthCookie(request: Request, provider: OAuthProvider, name: "state" | "return") {
  const value = request.headers.get("cookie")?.match(new RegExp(`(?:^|;\\s*)ff_oauth_${provider}_${name}=([^;]*)`))?.[1];
  try { return value ? decodeURIComponent(value) : ""; } catch { return ""; }
}

export function oauthRedirect(request: Request, provider: OAuthProvider, path: string) {
  const headers = new Headers({ location: new URL(path, oauthOrigin(request)).toString(), "cache-control": "no-store" });
  headers.append("set-cookie", oauthCookie(request, provider, "state", "", 0));
  headers.append("set-cookie", oauthCookie(request, provider, "return", "", 0));
  return headers;
}

export function oauthFailure(request: Request, provider: OAuthProvider, reason: string) {
  const query = new URLSearchParams({ oauth: reason, provider, return_to: safeReturnTo(readOAuthCookie(request, provider, "return")) });
  return new Response(null, { status: 302, headers: oauthRedirect(request, provider, `/login?${query}`) });
}
