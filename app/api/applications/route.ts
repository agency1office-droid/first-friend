import { desc, eq } from "drizzle-orm";
import { applications, directAnimals, readinessAssessments, shelterProfiles } from "../../../db/schema";
import { getAnimalById, getAnimalContactById } from "../../../lib/public-data";
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
  const animal=await getAnimalById(animalId),profile=JSON.parse(assessment.profileJson||"{}") as Record<string,unknown>,reasons:string[]=[],concerns:string[]=[];let suitability=assessment.readinessScore;
  if(animal){const desired=assessment.species==="cat"?"고양이":"강아지";if(animal.species.includes(desired)){suitability+=5;reasons.push("종별 필수 교육 완료")}if(Number(profile.absence)<=6){suitability+=3;reasons.push("부재 시간이 돌봄 계획과 잘 맞아요")}else if(animal.traits.some(v=>v.includes("활발"))){suitability-=8;concerns.push("활동량 대비 긴 부재 시간을 상담해 주세요")}if(profile.household==="yes")reasons.push("동거인 동의 확인");else{concerns.push("가족 동의가 더 필요해요");suitability-=8}if(Number(profile.emergencyFund)>=1000000)reasons.push("응급 진료 대비금 준비")}
  suitability=Math.max(0,Math.min(100,suitability));const suitabilityJson=JSON.stringify({reasons,concerns,animalTraits:animal?.traits||[]});
  const directId=animalId.startsWith("direct-")?Number(animalId.slice(7)):NaN;
  const guardian=Number.isInteger(directId)?await auth.db.query.directAnimals.findFirst({where:eq(directAnimals.id,directId)}):null;
  const shelterProfile=!guardian&&animal?await auth.db.query.shelterProfiles.findFirst({where:eq(shelterProfiles.name,animal.shelter)}):null;
  const [application] = await auth.db.insert(applications).values({ memberId: auth.user.userId, guardianId:guardian?.memberId||shelterProfile?.ownerId||null, animalId, household, carePlan, absencePlan, emergencyPlan, readinessScore: assessment.readinessScore, suitabilityScore:suitability,suitabilityJson, readinessAssessmentId: assessment.id, agreementAccepted: true }).returning();
  const contact = await getAnimalContactById(animalId);
  return Response.json({ application, contact }, { status: 201 });
}
