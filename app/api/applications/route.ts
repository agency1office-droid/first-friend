import { desc, eq } from "drizzle-orm";
import { applications, readinessAssessments } from "../../../db/schema";
import { getAnimalContactById } from "../../../lib/public-data";
import { authenticatedDb, clean } from "../_helpers";

export async function GET() {
  const auth = await authenticatedDb();
  if (!auth) return Response.json({ error: "본인 확인이 필요합니다." }, { status: 401 });
  const rows = await auth.db.select().from(applications).where(eq(applications.memberId, auth.user.userId)).orderBy(desc(applications.createdAt));
  return Response.json({ applications: rows });
}

export async function POST(request: Request) {
  const auth = await authenticatedDb();
  if (!auth) return Response.json({ error: "본인 확인이 필요합니다." }, { status: 401 });
  const assessment = await auth.db.query.readinessAssessments.findFirst({ where: eq(readinessAssessments.memberId, auth.user.userId), orderBy: [desc(readinessAssessments.completedAt)] });
  if (!assessment?.passed) return Response.json({ error: "입양 준비 시험을 먼저 완료해 주세요." }, { status: 412 });
  const data = await request.json() as Record<string, unknown>;
  const animalId = clean(data.animalId, 40), household = clean(data.household), carePlan = clean(data.carePlan), absencePlan = clean(data.absencePlan), emergencyPlan = clean(data.emergencyPlan);
  if (!animalId || household.length < 30 || carePlan.length < 30 || absencePlan.length < 20 || emergencyPlan.length < 20 || data.agreementAccepted !== true) return Response.json({ error: "신청 내용과 필수 동의를 확인해 주세요." }, { status: 400 });
  const [application] = await auth.db.insert(applications).values({ memberId: auth.user.userId, animalId, household, carePlan, absencePlan, emergencyPlan, readinessScore: assessment.readinessScore, readinessAssessmentId: assessment.id, agreementAccepted: true }).returning();
  const contact = await getAnimalContactById(animalId);
  return Response.json({ application, contact }, { status: 201 });
}
