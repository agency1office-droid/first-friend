import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { memberFromSession, safeReturnTo, SESSION_COOKIE } from "../lib/app-auth";

export type ChatGPTUser = { userId: string; displayName: string; email: string; fullName: string | null };

export async function getChatGPTUser(): Promise<ChatGPTUser | null> {
  const token = (await cookies()).get(SESSION_COOKIE)?.value;
  if (!token) return null;
  const { getDb } = await import("../db");
  const member = await memberFromSession(getDb(), token);
  if (!member || member.sanctioned) return null;
  return { userId: member.id, displayName: member.displayName, email: member.email, fullName: member.displayName };
}

export async function requireChatGPTUser(returnTo: string) {
  const user = await getChatGPTUser();
  if (user) return user;
  redirect(chatGPTSignInPath(returnTo));
}

export function chatGPTSignInPath(returnTo: string) { return `/login?return_to=${encodeURIComponent(safeReturnTo(returnTo))}`; }
export function chatGPTSignOutPath(returnTo = "/") { return `/api/auth/logout?return_to=${encodeURIComponent(safeReturnTo(returnTo))}`; }
