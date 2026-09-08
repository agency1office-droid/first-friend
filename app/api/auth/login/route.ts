import { createSession, isLocalRequest, safeReturnTo, sessionHeaders, verifyPassword } from "../../../../lib/app-auth";
import { getSupabaseServerClient } from "../../../../lib/supabase/server";
import { enforceRateLimit, requestSubject } from "../../../../lib/api-guards";
import { readJson } from "../../_helpers";

export async function POST(request: Request) {
  if (request.headers.get("origin") && request.headers.get("origin") !== new URL(request.url).origin) return Response.json({ error: "요청 주소를 확인해 주세요." }, { status: 403 });
  const data = await readJson(request);
  if (!data || typeof data.email !== "string" || typeof data.password !== "string" || data.email.length > 254 || data.password.length > 1024) return Response.json({ error: "이메일과 비밀번호를 확인해 주세요." }, { status: 400 });
  const email = String(data.email || "").trim().toLowerCase(), password = String(data.password || "");
  if (!await enforceRateLimit("auth-login", `${requestSubject(request)}:${email}`, 900, 10)) return Response.json({ error: "로그인 시도가 너무 많아요. 잠시 후 다시 시도해 주세요." }, { status: 429, headers: { "retry-after": "900" } });
  const { data: accounts } = await getSupabaseServerClient().from("auth_accounts").select("*").eq("provider", "email").eq("email", email).limit(1);
  const account = accounts?.[0] as { member_id?: string; password_hash?: string; password_salt?: string } | undefined;
  if (!account?.password_hash || !account.password_salt || !(await verifyPassword(password, account.password_salt, account.password_hash))) return Response.json({ error: "이메일 또는 비밀번호가 올바르지 않습니다." }, { status: 401 });
  const { data: member, error } = await getSupabaseServerClient().from("members").select("id,sanctioned").eq("id", account.member_id || "").maybeSingle();
  if (error) return Response.json({ error: "로그인을 확인하지 못했어요. 잠시 후 다시 시도해 주세요." }, { status: 503 });
  if (!member || member.sanctioned) return Response.json({ error: "이용이 제한된 계정이에요." }, { status: 403 });
  const session = await createSession(undefined, account.member_id || "");
  return Response.json({ ok: true, returnTo: safeReturnTo(String(data.returnTo || "")) }, { headers: await sessionHeaders(session.token, !isLocalRequest(request)) });
}
