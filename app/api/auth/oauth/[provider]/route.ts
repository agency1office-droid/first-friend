import { randomToken, safeReturnTo } from "../../../../../lib/app-auth";
import { isOAuthProvider, oauthCookie, oauthOrigin, oauthProviders } from "../../../../../lib/oauth";

export async function GET(request: Request, { params }: { params: Promise<{ provider: string }> }) {
  const { provider } = await params;
  if (!isOAuthProvider(provider)) return Response.json({ error: "지원하지 않는 로그인입니다." }, { status: 404 });
  let origin: string;
  try { origin = oauthOrigin(request); } catch { return Response.json({ error: "운영 사이트에서 다시 로그인해 주세요." }, { status: 400 }); }
  const requestUrl = new URL(request.url);
  if (requestUrl.origin !== origin) return Response.redirect(new URL(requestUrl.pathname + requestUrl.search, origin), 302);
  const returnTo = safeReturnTo(requestUrl.searchParams.get("return_to"));
  const config = oauthProviders[provider];
  const clientId = process.env[config.client]?.trim();
  if (!clientId || !process.env[config.secret]?.trim()) {
    const query = new URLSearchParams({ oauth: "unconfigured", provider, return_to: returnTo });
    return Response.redirect(new URL(`/login?${query}`, origin), 302);
  }
  const state = randomToken(32);
  const url = new URL(config.authorize);
  url.search = new URLSearchParams({ response_type: "code", client_id: clientId, redirect_uri: `${origin}/api/auth/oauth/${provider}/callback`, state }).toString();
  if (config.scope) url.searchParams.set("scope", config.scope);
  const headers = new Headers({ location: url.toString(), "cache-control": "no-store" });
  headers.append("set-cookie", oauthCookie(request, provider, "state", state));
  headers.append("set-cookie", oauthCookie(request, provider, "return", returnTo));
  return new Response(null, { status: 302, headers });
}
