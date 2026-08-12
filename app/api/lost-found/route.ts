import { getChatGPTUser } from "../../chatgpt-auth";
import { getSupabaseServerClient } from "../../../lib/supabase/server";
import { clean } from "../_helpers";
import { getLostAnimals, prioritizeLostAnimals } from "../../../lib/public-data";

export async function GET(request: Request) {
  const homeRegion = new URL(request.url).searchParams.get("region") || "";
  return Response.json({ animals: prioritizeLostAnimals(await getLostAnimals(1000), homeRegion) });
}

export async function POST(request: Request) {
  const user = await getChatGPTUser();
  if (!user) return Response.json({ error: "본인 확인이 필요합니다." }, { status: 401 });
  const supabase = getSupabaseServerClient();
  const data = await request.json() as Record<string, unknown>;
  const kind = clean(data.kind, 10) as "lost" | "found", species = clean(data.species, 30), region = clean(data.region, 80), occurredAt = clean(data.occurredAt, 40), description = clean(data.description), imageKey = clean(data.imageKey, 240), ownershipQuestion = clean(data.ownershipQuestion, 300), alertRegion = clean(data.alertRegion, 80);
  if (!["lost", "found"].includes(kind) || !species || !region || !occurredAt || description.length < 20 || (kind === "lost" && ownershipQuestion.length < 10)) return Response.json({ error: "신고 내용과 소유 확인 질문을 확인해 주세요." }, { status: 400 });
  const suppliedTags=Array.isArray(data.visualTags)?data.visualTags.map(value=>clean(value,40)).filter(Boolean).slice(0,12):[];
  const visualTags = Array.from(new Set([...( `${species} ${description}`.toLowerCase().match(/검정|흰색|회색|갈색|치즈|삼색|줄무늬|장모|단모|소형|중형|대형|접힌 귀|큰 눈/g) || []),...suppliedTags]));
  const { data: report, error: reportError } = await supabase.from("lost_reports").insert({ member_id:user.userId, kind, species, region:region.split(" ").slice(0,3).join(" "), occurred_at:occurredAt, description, image_key:imageKey || null, ownership_question:ownershipQuestion, alert_region:alertRegion, visual_tags_json:JSON.stringify(visualTags) }).select("*").single();
  if (reportError || !report) return Response.json({ error: "신고를 저장하지 못했어요." }, { status: 500 });
  const { data: candidates } = await supabase.from("lost_reports").select("*").eq("kind",kind==="lost"?"found":"lost").eq("status","active").order("created_at", { ascending:false }).limit(30);
  const matches = (candidates || []).map(candidate=>{const reasons:string[]=[];let score=0;if(candidate.species===species){score+=45;reasons.push("같은 동물 종류")}const a=region.split(" "),b=String(candidate.region||"").split(" ");if(a[0]&&a[0]===b[0]){score+=20;reasons.push("같은 시·도")}if(a[1]&&a[1]===b[1]){score+=20;reasons.push("같은 시·군·구")}const candidateTags=JSON.parse(candidate.visual_tags_json||"[]") as string[];const common=visualTags.filter(tag=>candidateTags.includes(tag));if(common.length){score+=Math.min(15,common.length*5);reasons.push(`${common.join("·")} 특징 유사`)}return{candidate,score,reasons}}).filter(item=>item.score>=65).sort((a,b)=>b.score-a.score).slice(0,5);
  for(const match of matches){const lostReportId=kind==="lost"?report.id:match.candidate.id,foundReportId=kind==="found"?report.id:match.candidate.id;await supabase.from("lost_matches").upsert({lost_report_id:lostReportId,found_report_id:foundReportId,score:match.score,reasons_json:JSON.stringify(match.reasons)},{onConflict:"lost_report_id,found_report_id",ignoreDuplicates:true});await supabase.from("notifications").insert({member_id:match.candidate.member_id,type:"lost_match",title:"비슷한 실종·발견 제보가 등록됐어요",body:`${match.reasons.join(" · ")} 기준으로 ${match.score}% 가능성을 확인해 주세요.`,href:"/mypage"});}
  return Response.json({ report, matches:matches.map(item=>({score:item.score,reasons:item.reasons})) }, { status: 201 });
}
