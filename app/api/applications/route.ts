import { getChatGPTUser } from "../../chatgpt-auth";import { getSupabaseServerClient } from "../../../lib/supabase/server";
import { getAnimalById, getAnimalContactById, getShelters } from "../../../lib/public-data";
import { clean, readJson } from "../_helpers";

export async function GET() {
  const user=await getChatGPTUser();if(!user)return Response.json({error:"본인 확인이 필요합니다."},{status:401});const{data:rows}=await getSupabaseServerClient().from("applications").select("*").eq("member_id",user.userId).order("created_at",{ascending:false});return Response.json({applications:rows||[]});
}

export async function POST(request: Request) {
  const user=await getChatGPTUser();if(!user)return Response.json({error:"본인 확인이 필요합니다."},{status:401});const client=getSupabaseServerClient();const{data:assessments}=await client.from("readiness_assessments").select("*").eq("member_id",user.userId).order("completed_at",{ascending:false}).limit(1);const assessment=assessments?.[0];if(!assessment?.passed)return Response.json({error:"입양 준비 시험을 먼저 완료해 주세요."},{status:412});
  const data = await readJson(request);
  if (!data) return Response.json({ error: "요청 형식을 확인해 주세요." }, { status: 400 });
  const rawAdopterAge = Number(data.adopterAge), adopterAge = Number.isInteger(rawAdopterAge) ? rawAdopterAge : 0;
  const animalId = clean(data.animalId, 40), household = clean(data.household), carePlan = clean(data.carePlan), absencePlan = clean(data.absencePlan), emergencyPlan = clean(data.emergencyPlan);
  if (!animalId || adopterAge < 18 || adopterAge > 90 || household.length < 30 || carePlan.length < 30 || absencePlan.length < 20 || emergencyPlan.length < 20 || data.agreementAccepted !== true) return Response.json({ error: "나이·신청 내용과 필수 동의를 확인해 주세요." }, { status: 400 });
  const animal=await getAnimalById(animalId),profile=(() => { try { const value = JSON.parse(assessment.profile_json || "{}"); return value && typeof value === "object" ? value as Record<string, unknown> : {}; } catch { return {}; } })(),reasons:string[]=[],concerns:string[]=[];let suitability=assessment.readiness_score;
  if(animal){const desired=assessment.species==="cat"?"고양이":"강아지";if(animal.species.includes(desired)){suitability+=5;reasons.push("종별 필수 교육 완료")}if(Number(profile.absence)<=6){suitability+=3;reasons.push("부재 시간이 돌봄 계획과 잘 맞아요")}else if(animal.traits.some(v=>v.includes("활발"))){suitability-=8;concerns.push("활동량 대비 긴 부재 시간을 상담해 주세요")}if(profile.household==="yes")reasons.push("동거인 동의 확인");else{concerns.push("가족 동의가 더 필요해요");suitability-=8}if(Number(profile.emergencyFund)>=1000000)reasons.push("응급 진료 대비금 준비")}
  suitability=Math.max(0,Math.min(100,suitability));const suitabilityJson=JSON.stringify({reasons,concerns,animalTraits:animal?.traits||[]});
  const guardian=null;
  const publicShelter=!guardian&&animal?(await getShelters(100)).find(item=>item.name===animal.shelter):null;
  const {data:application,error}=await client.from("applications").insert({member_id:user.userId,guardian_id:null,shelter_public_id:publicShelter?.id||null,animal_id:animalId,household,care_plan:carePlan,absence_plan:absencePlan,emergency_plan:emergencyPlan,adopter_age:adopterAge,readiness_score:assessment.readiness_score,suitability_score:suitability,suitability_json:suitabilityJson,readiness_assessment_id:assessment.id,agreement_accepted:true}).select("*").single();if(error)return Response.json({error:"입양 신청을 저장하지 못했어요."},{status:500});
  const contact = await getAnimalContactById(animalId);
  return Response.json({ application, contact, channelStatus: application.guardian_id ? "delivered" : publicShelter ? "awaiting_onboarding" : "direct_contact" }, { status: 201 });
}
