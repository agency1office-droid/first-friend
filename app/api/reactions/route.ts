import { and, eq } from "drizzle-orm";
import { postReactions } from "../../../db/schema";
import { authenticatedDb } from "../_helpers";

export async function POST(request: Request) { const auth = await authenticatedDb(); if (!auth) return Response.json({ error: "본인 확인이 필요합니다." }, { status: 401 }); const data = await request.json() as { postId?: number; reaction?: "cheer" | "heart" }; const postId = Number(data.postId); if (!postId) return Response.json({ error: "이야기 정보가 필요합니다." }, { status: 400 }); const existing = await auth.db.query.postReactions.findFirst({ where: and(eq(postReactions.memberId, auth.user.userId), eq(postReactions.postId, postId)) }); if (existing) { await auth.db.delete(postReactions).where(eq(postReactions.id, existing.id)); return Response.json({ active: false }); } await auth.db.insert(postReactions).values({ memberId: auth.user.userId, postId, reaction: data.reaction || "cheer" }); return Response.json({ active: true }, { status: 201 }); }
