import { getSupabaseServerClient } from "../../../../lib/supabase/server";
import { clearSessionCookie, displayScopeCookie, isLocalRequest, safeReturnTo, sha256, SESSION_COOKIE } from "../../../../lib/app-auth";

export async function GET(request: Request) {
  const cookie = request.headers.get("cookie")?.match(new RegExp(`(?:^|;\\s*)${SESSION_COOKIE}=([^;]+)`))?.[1];
  if (cookie) await getSupabaseServerClient().from("auth_sessions").delete().eq("token_hash", await sha256(cookie));
  const headers = new Headers({ location: new URL(safeReturnTo(new URL(request.url).searchParams.get("return_to")), request.url).toString(), "set-cookie": clearSessionCookie(!isLocalRequest(request)), "cache-control": "private, no-store" });
  headers.append("set-cookie", displayScopeCookie("guest", !isLocalRequest(request)));
  return new Response(null, { status: 302, headers });
}
