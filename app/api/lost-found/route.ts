import { lostReports } from "../../../db/schema";
import { authenticatedDb, clean } from "../_helpers";

export async function POST(request: Request) {
  const auth = await authenticatedDb();
  if (!auth) return Response.json({ error: "본인 확인이 필요합니다." }, { status: 401 });
  const data = await request.json() as Record<string, unknown>;
  const kind = clean(data.kind, 10) as "lost" | "found", species = clean(data.species, 30), region = clean(data.region, 80), occurredAt = clean(data.occurredAt, 40), description = clean(data.description), imageKey = clean(data.imageKey, 240), ownershipQuestion = clean(data.ownershipQuestion, 300), alertRegion = clean(data.alertRegion, 80);
  if (!["lost", "found"].includes(kind) || !species || !region || !occurredAt || description.length < 20 || (kind === "lost" && ownershipQuestion.length < 10)) return Response.json({ error: "신고 내용과 소유 확인 질문을 확인해 주세요." }, { status: 400 });
  const [report] = await auth.db.insert(lostReports).values({ memberId: auth.user.userId, kind, species, region, occurredAt, description, imageKey: imageKey || null, ownershipQuestion, alertRegion }).returning();
  return Response.json({ report }, { status: 201 });
}
