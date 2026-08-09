import { eq } from "drizzle-orm";
import { members } from "../../../db/schema";
import { authenticatedDb } from "../_helpers";

export async function GET() { const auth = await authenticatedDb(); if (!auth) return Response.json({ completed: false }, { status: 401 }); return Response.json({ completed: auth.member.fosterEducationCompleted }); }
export async function POST(request: Request) { const auth = await authenticatedDb(); if (!auth) return Response.json({ error: "본인 확인이 필요합니다." }, { status: 401 }); const data = await request.json() as Record<string, unknown>,answers=Array.isArray(data.answers)?data.answers:[],correct=[false,false,true,false,true],score=Math.round(correct.reduce((sum,value,index)=>sum+(answers[index]===value?1:0),0)/correct.length*100); if (score < 80) return Response.json({ error: "기본 교육을 다시 확인해 주세요." }, { status: 400 }); await auth.db.update(members).set({ fosterEducationCompleted: true }).where(eq(members.id, auth.user.userId)); return Response.json({ completed: true, score }); }
