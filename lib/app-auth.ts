import { and, eq, gt } from "drizzle-orm";
import { authAccounts, authSessions, members } from "../db/schema";

export const SESSION_COOKIE = "ff_session";
export const SESSION_DAYS = 30;

type Db = ReturnType<typeof import("../db").getDb>;

function hex(bytes: Uint8Array) { return Array.from(bytes, value => value.toString(16).padStart(2, "0")).join(""); }
function bytes(value: string) { return new Uint8Array(value.match(/.{1,2}/g)?.map(part => Number.parseInt(part, 16)) || []); }

export async function sha256(value: string) {
  return hex(new Uint8Array(await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value))));
}

export async function hashPassword(password: string, salt = hex(crypto.getRandomValues(new Uint8Array(16)))) {
  const material = await crypto.subtle.importKey("raw", new TextEncoder().encode(password), "PBKDF2", false, ["deriveBits"]);
  // Cloudflare Workers Web Crypto supports PBKDF2 up to 100,000 iterations.
  const result = await crypto.subtle.deriveBits({ name: "PBKDF2", hash: "SHA-256", salt: bytes(salt), iterations: 100_000 }, material, 256);
  return { salt, hash: hex(new Uint8Array(result)) };
}

export async function verifyPassword(password: string, salt: string, expected: string) {
  const actual = (await hashPassword(password, salt)).hash;
  if (actual.length !== expected.length) return false;
  let mismatch = 0;
  for (let index = 0; index < actual.length; index++) mismatch |= actual.charCodeAt(index) ^ expected.charCodeAt(index);
  return mismatch === 0;
}

export function randomToken(size = 32) { return hex(crypto.getRandomValues(new Uint8Array(size))); }

export async function createSession(db: Db, memberId: string) {
  const token = randomToken();
  const expiresAt = new Date(Date.now() + SESSION_DAYS * 86400000).toISOString();
  await db.insert(authSessions).values({ memberId, tokenHash: await sha256(token), expiresAt });
  return { token, expiresAt };
}

export function sessionCookie(token: string, maxAge = SESSION_DAYS * 86400, secure = true) {
  return `${SESSION_COOKIE}=${token}; Path=/; HttpOnly; ${secure ? "Secure; " : ""}SameSite=Lax; Max-Age=${maxAge}`;
}

export function clearSessionCookie(secure = true) { return `${SESSION_COOKIE}=; Path=/; HttpOnly; ${secure ? "Secure; " : ""}SameSite=Lax; Max-Age=0`; }

export function isLocalRequest(request: Request) {
  const hostname = new URL(request.url).hostname;
  return hostname === "localhost" || hostname === "127.0.0.1" || hostname === "::1";
}

export async function memberFromSession(db: Db, token: string) {
  const session = await db.query.authSessions.findFirst({ where: and(eq(authSessions.tokenHash, await sha256(token)), gt(authSessions.expiresAt, new Date().toISOString())) });
  if (!session) return null;
  return db.query.members.findFirst({ where: eq(members.id, session.memberId) });
}

export async function findOrCreateSocialMember(db: Db, provider: "google" | "kakao" | "naver", providerUserId: string, email: string, displayName: string) {
  const existing = await db.query.authAccounts.findFirst({ where: and(eq(authAccounts.provider, provider), eq(authAccounts.providerUserId, providerUserId)) });
  if (existing) return db.query.members.findFirst({ where: eq(members.id, existing.memberId) });
  const normalizedEmail = email.trim().toLowerCase();
  const emailAccount = normalizedEmail ? await db.query.authAccounts.findFirst({ where: eq(authAccounts.email, normalizedEmail) }) : null;
  const memberId = emailAccount?.memberId || crypto.randomUUID();
  if (!emailAccount) await db.insert(members).values({ id: memberId, email: normalizedEmail || `${providerUserId}@${provider}.first-friend.local`, displayName: displayName || "퍼스트프렌드 회원", verified: true });
  await db.insert(authAccounts).values({ memberId, provider, providerUserId, email: normalizedEmail, emailVerified: Boolean(normalizedEmail) });
  return db.query.members.findFirst({ where: eq(members.id, memberId) });
}

export function safeReturnTo(value: string | null | undefined) {
  if (!value?.startsWith("/") || value.startsWith("//")) return "/mypage";
  return value;
}
