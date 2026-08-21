import { getChatGPTUser } from "../../chatgpt-auth";import { getSupabaseServerClient } from "../../../lib/supabase/server";import { clean } from "../_helpers";
import { educationScore, readinessScore } from "../../../lib/readiness-score";

export async function GET() {
  const user=await getChatGPTUser();if(!user)return Response.json({error:"본인 확인이 필요합니다."},{status:401});
  const{data:rows,error}=await getSupabaseServerClient().from("readiness_assessments").select("*").eq("member_id",user.userId).order("completed_at",{ascending:false}).limit(50);
  if(error)return Response.json({error:"검사 결과를 불러오지 못했어요."},{status:500});
  const latestAssessment=rows?.[0]||null;
  const assessment=rows?.find((row) => row.passed) || latestAssessment;
  return Response.json({ assessment: assessment || null, latestAssessment });
}

export async function POST(request: Request) {
  const user=await getChatGPTUser();if(!user)return Response.json({error:"결과를 저장하려면 본인 확인이 필요합니다."},{status:401});
  const data = await request.json() as Record<string, unknown>;
  const species = clean(data.species, 10) as "cat" | "dog";
  const profile = typeof data.profile === "object" && data.profile ? data.profile : {};
  if (!["cat", "dog"].includes(species) || !Array.isArray(data.answers) || ![4, 10, 14, 17].includes(data.answers.length) || !data.answers.every((answer) => Number.isInteger(answer) && answer >= 0 && answer <= 2)) return Response.json({ error: "검사 결과를 확인해 주세요." }, { status: 400 });
  const verifiedReadiness = readinessScore(species, profile), verifiedEducation = educationScore(data.answers);
  const {data:assessment,error}=await getSupabaseServerClient().from("readiness_assessments").insert({member_id:user.userId,species,profile_json:JSON.stringify(profile).slice(0,12000),readiness_score:verifiedReadiness,education_score:verifiedEducation,passed:verifiedEducation>=80}).select("*").single();if(error)return Response.json({error:"검사 결과를 저장하지 못했어요."},{status:500});
  return Response.json({ assessment }, { status: 201 });
}
