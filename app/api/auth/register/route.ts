import { eq } from "drizzle-orm";
import { authAccounts, members } from "../../../../db/schema";
import { getDb } from "../../../../db";
import { createSession, hashPassword, safeReturnTo, sessionCookie } from "../../../../lib/app-auth";

export async function POST(request: Request) {
  const data = await request.json() as Record<string, unknown>;
  const email = String(data.email || "").trim().toLowerCase();
  const password = String(data.password || "");
  const displayName = String(data.displayName || "").trim().slice(0, 60);
  if (!/^\S+@\S+\.\S+$/.test(email) || password.length < 10 || !displayName) return Response.json({ error: "이름, 이메일, 10자 이상의 비밀번호를 확인해 주세요." }, { status: 400 });
  if (data.termsAccepted !== true) return Response.json({ error: "필수 약관에 동의해 주세요." }, { status: 400 });
  const db = getDb();
  if (await db.query.authAccounts.findFirst({ where: eq(authAccounts.email, email) })) return Response.json({ error: "이미 가입된 이메일입니다." }, { status: 409 });
  const memberId = crypto.randomUUID(), passwordResult = await hashPassword(password);
  await db.insert(members).values({ id: memberId, email, displayName, verified: false });
  await db.insert(authAccounts).values({ memberId, provider: "email", providerUserId: email, email, passwordHash: passwordResult.hash, passwordSalt: passwordResult.salt, emailVerified: false });
  const session = await createSession(db, memberId);
  return Response.json({ ok: true, returnTo: safeReturnTo(String(data.returnTo || "")), emailVerificationRequired: true }, { status: 201, headers: { "set-cookie": sessionCookie(session.token) } });
}
