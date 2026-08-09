import { and, desc, eq } from "drizzle-orm";
import { applications, directAnimals, posts } from "../../../db/schema";
import { authenticatedDb, clean } from "../_helpers";

const privatePattern = /(01[016789][\s.-]?\d{3,4}[\s.-]?\d{4})|(\d{1,4}번지)|(\d+동\s*\d+호)/;

export async function GET() { const auth = await authenticatedDb().catch(() => null); const db = auth?.db; if (!db) return Response.json({ posts: [] }); const rows = await db.select().from(posts).where(eq(posts.hidden, false)).orderBy(desc(posts.createdAt)).limit(50); return Response.json({ posts: rows }); }

export async function POST(request: Request) {
  const auth = await authenticatedDb();
  if (!auth) return Response.json({ error: "본인 확인이 필요합니다." }, { status: 401 });
  const data = await request.json() as Record<string, unknown>;
  const category = clean(data.category, 20) as "adoption" | "neighborhood" | "memory" | "rescue", title = clean(data.title, 80), body = clean(data.body), imageKey = clean(data.imageKey, 240);
  if (!["adoption", "neighborhood", "memory", "rescue"].includes(category) || !title || body.length < 20) return Response.json({ error: "공개할 이야기를 확인해 주세요." }, { status: 400 });
  if (privatePattern.test(`${title} ${body}`)) return Response.json({ error: "전화번호·번지·동호수처럼 정확한 개인정보는 공개 글에 적을 수 없어요." }, { status: 400 });
  if (category === "adoption") { const approved = await auth.db.query.applications.findFirst({ where: and(eq(applications.memberId, auth.user.userId), eq(applications.status, "approved")) }); if (!approved) return Response.json({ error: "입양 일기는 인증된 입양자만 작성할 수 있어요." }, { status: 403 }); }
  if (category === "rescue" && !["foster", "shelter", "admin"].includes(auth.member.role)) { const registration = await auth.db.query.directAnimals.findFirst({ where: eq(directAnimals.memberId, auth.user.userId) }); if (!registration) return Response.json({ error: "보호 이야기는 인증 보호자 또는 등록 임시보호자만 작성할 수 있어요." }, { status: 403 }); }
  const [post] = await auth.db.insert(posts).values({ memberId: auth.user.userId, category, title, body, imageKey: imageKey || null }).returning();
  return Response.json({ post }, { status: 201 });
}
