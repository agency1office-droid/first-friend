import { getSupabaseServerClient } from "../../../../lib/supabase/server";
import { clearSessionCookie, isLocalRequest, safeReturnTo, sha256, SESSION_COOKIE } from "../../../../lib/app-auth";

export async function GET(request: Request) {
  const cookie = request.headers.get("cookie")?.match(new RegExp(`(?:^|;\\s*)${SESSION_COOKIE}=([^;]+)`))?.[1];
  if (cookie) await getSupabaseServerClient().from("auth_sessions").delete().eq("token_hash", await sha256(cookie));
  return new Response(null, { status: 302, headers: { location: new URL(safeReturnTo(new URL(request.url).searchParams.get("return_to")), request.url).toString(), "set-cookie": clearSessionCookie(!isLocalRequest(request)) } });
}
