import { createSession, hashPassword, safeReturnTo, sessionCookie } from "../../../../lib/app-auth";
import { getSupabaseServerClient } from "../../../../lib/supabase/server";

export async function POST(request: Request) {
  const data = await request.json() as Record<string, unknown>;
  const email = String(data.email || "").trim().toLowerCase();
  const password = String(data.password || "");
  const displayName = String(data.displayName || "").trim().slice(0, 60);
  if (!/^\S+@\S+\.\S+$/.test(email) || password.length < 10 || !displayName) return Response.json({ error: "이름, 이메일, 10자 이상의 비밀번호를 확인해 주세요." }, { status: 400 });
  if (data.termsAccepted !== true) return Response.json({ error: "필수 약관에 동의해 주세요." }, { status: 400 });
  const supabase = getSupabaseServerClient();
  const { data: existing } = await supabase.from("auth_accounts").select("member_id").eq("email", email).limit(1);
  if (existing?.[0]) return Response.json({ error: "이미 가입된 이메일입니다." }, { status: 409 });
  const memberId = crypto.randomUUID(), passwordResult = await hashPassword(password);
  const { error: memberError } = await supabase.from("members").insert({ id: memberId, email, display_name: displayName, verified: false });
  if (memberError) return Response.json({ error: "회원 정보를 저장하지 못했어요." }, { status: 500 });
  const { error: accountError } = await supabase.from("auth_accounts").insert({ member_id: memberId, provider: "email", provider_user_id: email, email, password_hash: passwordResult.hash, password_salt: passwordResult.salt, email_verified: false });
  if (accountError) return Response.json({ error: "계정을 저장하지 못했어요." }, { status: 500 });
  const session = await createSession(undefined, memberId);
  return Response.json({ ok: true, returnTo: safeReturnTo(String(data.returnTo || "")), emailVerificationRequired: true }, { status: 201, headers: { "set-cookie": sessionCookie(session.token) } });
}
