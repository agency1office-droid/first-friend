import { eq } from "drizzle-orm";
import { members } from "../../../db/schema";
import { authenticatedDb } from "../_helpers";

export async function GET() { const auth = await authenticatedDb(); if (!auth) return Response.json({ completed: false }, { status: 401 }); return Response.json({ completed: auth.member.fosterEducationCompleted }); }
export async function POST(request: Request) { const auth = await authenticatedDb(); if (!auth) return Response.json({ error: "본인 확인이 필요합니다." }, { status: 401 }); const data = await request.json() as Record<string, unknown>; const score = Number(data.score) || 0; if (score < 80) return Response.json({ error: "기본 교육을 다시 확인해 주세요." }, { status: 400 }); await auth.db.update(members).set({ fosterEducationCompleted: true }).where(eq(members.id, auth.user.userId)); return Response.json({ completed: true }); }
