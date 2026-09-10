import { getChatGPTUser } from "../../chatgpt-auth";
import { getSupabaseServerClient } from "../../../lib/supabase/server";
import { clean, readJson } from "../_helpers";
import { getNearbyStoredLostAnimals } from "../../../lib/public-animal-store";
import { provinceVariants } from "../../../lib/lost-region";
import { logEvent } from "../../../lib/observability";

// 클라이언트가 넘기는 값이므로 LIKE 와일드카드가 섞이지 않도록 문자를 제한합니다.
const REGION_TOKEN = /^[가-힣A-Za-z0-9\s·-]{1,40}$/;

const FEED_CACHE = { "cache-control": "public, s-maxage=60, stale-while-revalidate=300" };

export async function GET(request: Request) {
  const params = new URL(request.url).searchParams;
  const province = (params.get("province") || "").trim();
  const prefix = (params.get("prefix") || "").trim();
  const dong = (params.get("dong") || "").trim();
  // 생활권을 정할 수 없는 방문자는 조회 없이 비웁니다. 비율을 남기려고 캐시하지 않습니다.
  if (!REGION_TOKEN.test(province) || !REGION_TOKEN.test(prefix) || (dong && !REGION_TOKEN.test(dong))) {
    logEvent("lost_feed_served", { radius: "", dong: false, count: 0 });
    return Response.json({ animals: [] }, { headers: { "cache-control": "no-store" } });
  }
  try {
    // 생활권 상한과 상위 8개 선별을 DB에서 처리합니다.
    const animals = await getNearbyStoredLostAnimals({ provinces: provinceVariants(province), prefix, dong: dong || null }, 8);
    logEvent("lost_feed_served", { radius: prefix, dong: Boolean(dong), count: animals.length });
    return Response.json({ animals }, { headers: FEED_CACHE });
  } catch {
    return Response.json({ error: "실종·발견 정보를 불러오지 못했어요.", animals: [] }, { status: 503 });
  }
}

export async function POST(request: Request) {
  const user = await getChatGPTUser();
  if (!user) return Response.json({ error: "본인 확인이 필요합니다." }, { status: 401 });
  const supabase = getSupabaseServerClient();
  const data = await readJson(request);
  if (!data) return Response.json({ error: "요청 형식을 확인해 주세요." }, { status: 400 });
  const kind = clean(data.kind, 10) as "lost" | "found", species = clean(data.species, 30), region = clean(data.region, 80), occurredAt = clean(data.occurredAt, 40), description = clean(data.description), imageKey = clean(data.imageKey, 240), ownershipQuestion = clean(data.ownershipQuestion, 300), alertRegion = clean(data.alertRegion, 80);
  if (!["lost", "found"].includes(kind) || !species || !region || !occurredAt || description.length < 20 || (kind === "lost" && ownershipQuestion.length < 10)) return Response.json({ error: "신고 내용과 소유 확인 질문을 확인해 주세요." }, { status: 400 });
  const suppliedTags=Array.isArray(data.visualTags)?data.visualTags.map(value=>clean(value,40)).filter(Boolean).slice(0,12):[];
  const visualTags = Array.from(new Set([...( `${species} ${description}`.toLowerCase().match(/검정|흰색|회색|갈색|치즈|삼색|줄무늬|장모|단모|소형|중형|대형|접힌 귀|큰 눈/g) || []),...suppliedTags]));
  const { data: report, error: reportError } = await supabase.from("lost_reports").insert({ member_id:user.userId, kind, species, region:region.split(" ").slice(0,3).join(" "), occurred_at:occurredAt, description, image_key:imageKey || null, ownership_question:ownershipQuestion, alert_region:alertRegion, visual_tags_json:JSON.stringify(visualTags) }).select("*").single();
  if (reportError || !report) return Response.json({ error: "신고를 저장하지 못했어요." }, { status: 500 });
  const { data: candidates } = await supabase.from("lost_reports").select("*").eq("kind",kind==="lost"?"found":"lost").eq("status","active").order("created_at", { ascending:false }).limit(30);
  const matches = (candidates || []).map(candidate=>{const reasons:string[]=[];let score=0;if(candidate.species===species){score+=45;reasons.push("같은 동물 종류")}const a=region.split(" "),b=String(candidate.region||"").split(" ");if(a[0]&&a[0]===b[0]){score+=20;reasons.push("같은 시·도")}if(a[1]&&a[1]===b[1]){score+=20;reasons.push("같은 시·군·구")}let candidateTags:string[]=[];try{const parsed=JSON.parse(candidate.visual_tags_json||"[]");candidateTags=Array.isArray(parsed)?parsed.map(String):[]}catch{candidateTags=[]}const common=visualTags.filter(tag=>candidateTags.includes(tag));if(common.length){score+=Math.min(15,common.length*5);reasons.push(`${common.join("·")} 특징 유사`)}return{candidate,score,reasons}}).filter(item=>item.score>=65).sort((a,b)=>b.score-a.score).slice(0,5);
  for(const match of matches){const lostReportId=kind==="lost"?report.id:match.candidate.id,foundReportId=kind==="found"?report.id:match.candidate.id;await supabase.from("lost_matches").upsert({lost_report_id:lostReportId,found_report_id:foundReportId,score:match.score,reasons_json:JSON.stringify(match.reasons)},{onConflict:"lost_report_id,found_report_id",ignoreDuplicates:true});await supabase.from("notifications").insert({member_id:match.candidate.member_id,type:"lost_match",title:"비슷한 실종·발견 제보가 등록됐어요",body:`${match.reasons.join(" · ")} 기준으로 ${match.score}% 가능성을 확인해 주세요.`,href:"/mypage"});}
  return Response.json({ report, matches:matches.map(item=>({score:item.score,reasons:item.reasons})) }, { status: 201 });
}
