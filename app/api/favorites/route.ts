import { and, eq } from "drizzle-orm";
import { favorites } from "../../../db/schema";
import { authenticatedDb, clean } from "../_helpers";

export async function GET() { const auth = await authenticatedDb(); if (!auth) return Response.json({ favorites: [] }); const rows = await auth.db.select().from(favorites).where(eq(favorites.memberId, auth.user.userId)); return Response.json({ favorites: rows }); }
export async function POST(request: Request) { const auth = await authenticatedDb(); if (!auth) return Response.json({ error: "본인 확인이 필요합니다." }, { status: 401 }); const data = await request.json() as Record<string, unknown>; const animalId = clean(data.animalId, 40); if (!animalId) return Response.json({ error: "동물 정보가 필요합니다." }, { status: 400 }); await auth.db.insert(favorites).values({ memberId: auth.user.userId, animalId }).onConflictDoNothing(); return Response.json({ saved: true }, { status: 201 }); }
export async function DELETE(request: Request) { const auth = await authenticatedDb(); if (!auth) return Response.json({ error: "본인 확인이 필요합니다." }, { status: 401 }); const data = await request.json() as Record<string, unknown>; const animalId = clean(data.animalId, 40); await auth.db.delete(favorites).where(and(eq(favorites.memberId, auth.user.userId), eq(favorites.animalId, animalId))); return Response.json({ saved: false }); }
