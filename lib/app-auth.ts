import { getSupabaseServerClient } from "./supabase/server";

export const SESSION_COOKIE = "ff_session";
export const SESSION_DAYS = 30;

type Db = unknown;
type Member = { id: string; email: string; displayName: string; role: string; verified: boolean; sanctioned?: boolean; [key: string]: unknown };

function memberRow(row: Record<string, unknown> | null): Member | null {
  if (!row) return null;
  return { ...row, displayName: String(row.display_name ?? ""), id: String(row.id ?? ""), email: String(row.email ?? ""), role: String(row.role ?? "member"), verified: Boolean(row.verified), sanctioned: Boolean(row.sanctioned) };
}

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
  const { error } = await getSupabaseServerClient().from("auth_sessions").insert({ member_id: memberId, token_hash: await sha256(token), expires_at: expiresAt });
  if (error) throw error;
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
  const { data: sessions, error } = await getSupabaseServerClient().from("auth_sessions").select("member_id").eq("token_hash", await sha256(token)).gt("expires_at", new Date().toISOString()).limit(1);
  if (error || !sessions?.[0]) return null;
  const { data: rows } = await getSupabaseServerClient().from("members").select("*").eq("id", sessions[0].member_id).limit(1);
  return memberRow((rows?.[0] as Record<string, unknown>) || null);
}

export async function findOrCreateSocialMember(db: Db, provider: "google" | "kakao" | "naver", providerUserId: string, email: string, displayName: string) {
  const supabase = getSupabaseServerClient();
  const { data: existingRows } = await supabase.from("auth_accounts").select("member_id").eq("provider", provider).eq("provider_user_id", providerUserId).limit(1);
  if (existingRows?.[0]) {
    const { data: rows } = await supabase.from("members").select("*").eq("id", existingRows[0].member_id).limit(1);
    return memberRow((rows?.[0] as Record<string, unknown>) || null);
  }
  const normalizedEmail = email.trim().toLowerCase();
  const { data: emailRows } = normalizedEmail ? await supabase.from("auth_accounts").select("member_id").eq("email", normalizedEmail).limit(1) : { data: [] };
  const memberId = emailRows?.[0]?.member_id || crypto.randomUUID();
  if (!emailRows?.[0]) await supabase.from("members").insert({ id: memberId, email: normalizedEmail || `${providerUserId}@${provider}.first-friend.local`, display_name: displayName || "퍼스트프렌드 회원", verified: true });
  await supabase.from("auth_accounts").insert({ member_id: memberId, provider, provider_user_id: providerUserId, email: normalizedEmail, email_verified: Boolean(normalizedEmail) });
  const { data: rows } = await supabase.from("members").select("*").eq("id", memberId).limit(1);
  return memberRow((rows?.[0] as Record<string, unknown>) || null);
}

export function safeReturnTo(value: string | null | undefined) {
  if (!value?.startsWith("/") || value.startsWith("//")) return "/mypage";
  return value;
}
