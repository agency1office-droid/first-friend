import { desc, eq } from "drizzle-orm";
import { readinessAssessments } from "../../../db/schema";
import { authenticatedDb, clean } from "../_helpers";
import { educationScore, readinessScore } from "../../../lib/readiness-score";

export async function GET() {
  const auth = await authenticatedDb();
  if (!auth) return Response.json({ error: "본인 확인이 필요합니다." }, { status: 401 });
  const assessment = await auth.db.query.readinessAssessments.findFirst({ where: eq(readinessAssessments.memberId, auth.user.userId), orderBy: [desc(readinessAssessments.completedAt)] });
  return Response.json({ assessment: assessment || null });
}

export async function POST(request: Request) {
  const auth = await authenticatedDb();
  if (!auth) return Response.json({ error: "결과를 저장하려면 본인 확인이 필요합니다." }, { status: 401 });
  const data = await request.json() as Record<string, unknown>;
  const species = clean(data.species, 10) as "cat" | "dog";
  const profile = typeof data.profile === "object" && data.profile ? data.profile : {};
  if (!["cat", "dog"].includes(species) || !Array.isArray(data.answers) || data.answers.length !== 10) return Response.json({ error: "검사 결과를 확인해 주세요." }, { status: 400 });
  const verifiedReadiness = readinessScore(species, profile), verifiedEducation = educationScore(data.answers);
  const [assessment] = await auth.db.insert(readinessAssessments).values({ memberId: auth.user.userId, species, profileJson: JSON.stringify(profile).slice(0, 12000), readinessScore: verifiedReadiness, educationScore: verifiedEducation, passed: verifiedEducation >= 80 }).returning();
  return Response.json({ assessment }, { status: 201 });
}
