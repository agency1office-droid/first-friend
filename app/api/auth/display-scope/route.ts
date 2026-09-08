import { SESSION_COOKIE, displayScopeCookie, isLocalRequest, sessionDisplayScope } from "../../../../lib/app-auth";

export async function GET(request: Request) {
  const token = request.headers.get("cookie")?.match(new RegExp(`(?:^|;\\s*)${SESSION_COOKIE}=([^;]+)`))?.[1];
  const scope = await sessionDisplayScope(token);
  return Response.json({ scope }, { headers: { "cache-control": "private, no-store", "set-cookie": displayScopeCookie(scope, !isLocalRequest(request)) } });
}
