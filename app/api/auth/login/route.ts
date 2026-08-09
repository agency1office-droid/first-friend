import { and, eq } from "drizzle-orm";
import { authAccounts } from "../../../../db/schema";
import { getDb } from "../../../../db";
import { createSession, safeReturnTo, sessionCookie, verifyPassword } from "../../../../lib/app-auth";

export async function POST(request: Request) {
  const data = await request.json() as Record<string, unknown>;
  const email = String(data.email || "").trim().toLowerCase(), password = String(data.password || "");
  const db = getDb();
  const account = await db.query.authAccounts.findFirst({ where: and(eq(authAccounts.provider, "email"), eq(authAccounts.email, email)) });
  if (!account?.passwordHash || !account.passwordSalt || !(await verifyPassword(password, account.passwordSalt, account.passwordHash))) return Response.json({ error: "이메일 또는 비밀번호가 올바르지 않습니다." }, { status: 401 });
  const session = await createSession(db, account.memberId);
  return Response.json({ ok: true, returnTo: safeReturnTo(String(data.returnTo || "")) }, { headers: { "set-cookie": sessionCookie(session.token) } });
}
