import { createSession, findOrCreateSocialMember, isLocalRequest, safeReturnTo, sessionHeaders } from "../../../../../../lib/app-auth";
import { isOAuthProvider, oauthFailure, oauthOrigin, oauthProviders, oauthRedirect, readOAuthCookie } from "../../../../../../lib/oauth";

export async function GET(request: Request, { params }: { params: Promise<{ provider: string }> }) {
  const { provider } = await params;
  if (!isOAuthProvider(provider)) return Response.json({ error: "지원하지 않는 로그인입니다." }, { status: 404 });
  let origin: string;
  try { origin = oauthOrigin(request); } catch { return Response.json({ error: "운영 사이트에서 다시 로그인해 주세요." }, { status: 400 }); }
  const url = new URL(request.url);
  const state = url.searchParams.get("state"), expected = readOAuthCookie(request, provider, "state");
  if (!state || !expected || state !== expected) return oauthFailure(request, provider, "state");
  if (url.searchParams.has("error")) return oauthFailure(request, provider, "cancelled");
  const code = url.searchParams.get("code");
  if (!code) return oauthFailure(request, provider, "failed");
  const config = oauthProviders[provider];
  const clientId = process.env[config.client]?.trim(), clientSecret = process.env[config.secret]?.trim();
  if (!clientId || !clientSecret) return oauthFailure(request, provider, "unconfigured");
  try {
    const body = new URLSearchParams({ grant_type: "authorization_code", client_id: clientId, client_secret: clientSecret, redirect_uri: `${origin}/api/auth/oauth/${provider}/callback`, code, state });
    const tokenResponse = await fetch(config.token, { method: "POST", headers: { "content-type": "application/x-www-form-urlencoded" }, body, signal: AbortSignal.timeout(10000) });
    const token = await tokenResponse.json() as { access_token?: unknown };
    if (!tokenResponse.ok || typeof token.access_token !== "string" || !token.access_token) return oauthFailure(request, provider, "failed");
    const profileResponse = await fetch(config.user, { headers: { authorization: `Bearer ${token.access_token}` }, signal: AbortSignal.timeout(10000) });
    if (!profileResponse.ok) return oauthFailure(request, provider, "failed");
    const record = (value: unknown): Record<string, unknown> => value && typeof value === "object" ? value as Record<string, unknown> : {};
    const profile = record(await profileResponse.json());
    const kakaoAccount = record(profile.kakao_account), kakaoProfile = record(kakaoAccount.profile), properties = record(profile.properties), naver = record(profile.response);
    const text = (value: unknown) => typeof value === "string" ? value : "";
    const id = provider === "google" ? text(profile.sub) : provider === "kakao" ? (typeof profile.id === "number" && Number.isSafeInteger(profile.id) ? String(profile.id) : "") : text(naver.id);
    if (!id || (provider === "naver" && profile.resultcode !== "00")) return oauthFailure(request, provider, "failed");
    const email = provider === "google" ? text(profile.email) : provider === "kakao" ? "" : text(naver.email);
    const name = provider === "google" ? text(profile.name) : provider === "kakao" ? text(kakaoProfile.nickname) || text(properties.nickname) : text(naver.nickname);
    const emailVerified = provider === "google" && profile.email_verified === true;
    const member = await findOrCreateSocialMember(undefined, provider, id, email, name, emailVerified);
    if (!member || member.sanctioned) return oauthFailure(request, provider, "failed");
    const session = await createSession(undefined, member.id);
    const headers = oauthRedirect(request, provider, safeReturnTo(readOAuthCookie(request, provider, "return")));
    for (const cookie of (await sessionHeaders(session.token, !isLocalRequest(request))).getSetCookie()) headers.append("set-cookie", cookie);
    return new Response(null, { status: 302, headers });
  } catch {
    // Provider responses can contain credentials. Never echo them into logs or URLs.
    return oauthFailure(request, provider, "failed");
  }
}
