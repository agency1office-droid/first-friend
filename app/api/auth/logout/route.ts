import { eq } from "drizzle-orm";
import { getDb } from "../../../../db";
import { authSessions } from "../../../../db/schema";
import { clearSessionCookie, safeReturnTo, sha256, SESSION_COOKIE } from "../../../../lib/app-auth";

export async function GET(request: Request) {
  const cookie = request.headers.get("cookie")?.match(new RegExp(`(?:^|;\\s*)${SESSION_COOKIE}=([^;]+)`))?.[1];
  if (cookie) await getDb().delete(authSessions).where(eq(authSessions.tokenHash, await sha256(cookie)));
  return new Response(null, { status: 302, headers: { location: new URL(safeReturnTo(new URL(request.url).searchParams.get("return_to")), request.url).toString(), "set-cookie": clearSessionCookie() } });
}
