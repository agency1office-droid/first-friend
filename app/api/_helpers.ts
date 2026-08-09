import { eq } from "drizzle-orm";
import { getChatGPTUser } from "../chatgpt-auth";
import { getDb } from "../../db";
import { accountSanctions, members } from "../../db/schema";

export async function authenticatedDb() {
  const user = await getChatGPTUser();
  if (!user) return null;
  const db = getDb();
  const digest=await crypto.subtle.digest("SHA-256",new TextEncoder().encode(user.email.trim().toLowerCase()));
  const fingerprintHash=Array.from(new Uint8Array(digest),v=>v.toString(16).padStart(2,"0")).join("");
  const blocked=await db.query.accountSanctions.findFirst({where:eq(accountSanctions.fingerprintHash,fingerprintHash)});
  if(blocked?.status==="confirmed")return null;
  await db.insert(members).values({ id: user.userId, email: user.email, displayName: user.displayName }).onConflictDoUpdate({ target: members.id, set: { email: user.email, displayName: user.displayName } });
  const member = await db.query.members.findFirst({ where: eq(members.id, user.userId) });
  if (!member || member.sanctioned) return null;
  return { db, user, member };
}

export function clean(value: unknown, max = 4000) { return typeof value === "string" ? value.trim().slice(0, max) : ""; }
