import { createSession, safeReturnTo, sessionCookie, verifyPassword } from "../../../../lib/app-auth";
import { getSupabaseServerClient } from "../../../../lib/supabase/server";

export async function POST(request: Request) {
  const data = await request.json() as Record<string, unknown>;
  const email = String(data.email || "").trim().toLowerCase(), password = String(data.password || "");
  const { data: accounts } = await getSupabaseServerClient().from("auth_accounts").select("*").eq("provider", "email").eq("email", email).limit(1);
  const account = accounts?.[0] as { member_id?: string; password_hash?: string; password_salt?: string } | undefined;
  if (!account?.password_hash || !account.password_salt || !(await verifyPassword(password, account.password_salt, account.password_hash))) return Response.json({ error: "이메일 또는 비밀번호가 올바르지 않습니다." }, { status: 401 });
  const session = await createSession(undefined, account.member_id || "");
  return Response.json({ ok: true, returnTo: safeReturnTo(String(data.returnTo || "")) }, { headers: { "set-cookie": sessionCookie(session.token) } });
}
