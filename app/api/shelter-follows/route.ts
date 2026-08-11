import { and, eq } from "drizzle-orm";
import { shelterFollows } from "../../../db/schema";
import { authenticatedDb, clean } from "../_helpers";

export async function GET(request: Request) {
  const auth = await authenticatedDb();
  if (!auth) return Response.json({ following: false }, { status: 401 });
  const shelterId = clean(new URL(request.url).searchParams.get("shelterId"), 120);
  const row = shelterId ? await auth.db.query.shelterFollows.findFirst({ where: and(eq(shelterFollows.shelterPublicId, shelterId), eq(shelterFollows.memberId, auth.user.userId)) }) : null;
  return Response.json({ following: Boolean(row) });
}

export async function POST(request: Request) {
  const auth = await authenticatedDb();
  if (!auth) return Response.json({ error: "로그인이 필요합니다." }, { status: 401 });
  const shelterId = clean((await request.json() as { shelterId?: string }).shelterId, 120);
  if (!shelterId) return Response.json({ error: "보호소 정보를 확인해 주세요." }, { status: 400 });
  const where = and(eq(shelterFollows.shelterPublicId, shelterId), eq(shelterFollows.memberId, auth.user.userId));
  const existing = await auth.db.query.shelterFollows.findFirst({ where });
  if (existing) { await auth.db.delete(shelterFollows).where(where); return Response.json({ following: false }); }
  await auth.db.insert(shelterFollows).values({ shelterPublicId: shelterId, memberId: auth.user.userId });
  return Response.json({ following: true }, { status: 201 });
}
