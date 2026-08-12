import { getChatGPTUser } from "../../chatgpt-auth";
import { clean } from "../_helpers";
import { getSupabaseServerClient } from "../../../lib/supabase/server";

const privatePattern = /(01[016789][\s.-]?\d{3,4}[\s.-]?\d{4})|(\d{1,4}번지)|(\d+동\s*\d+호)|(급식소|밥자리|포획\s*장소).{0,20}(앞|뒤|옆|골목|번지|출구)/;

export async function GET() { const { data } = await getSupabaseServerClient().from("posts").select("*").eq("hidden", false).order("created_at", { ascending: false }).limit(50); return Response.json({ posts: (data || []).map(row => ({ ...row, memberId: row.member_id, imageKey: row.image_key, createdAt: row.created_at, updatedAt: row.updated_at })) }); }

export async function POST(request: Request) {
  const user = await getChatGPTUser();
  if (!user) return Response.json({ error: "본인 확인이 필요합니다." }, { status: 401 });
  const supabase = getSupabaseServerClient();
  const data = await request.json() as Record<string, unknown>;
  const category = clean(data.category, 20) as "adoption" | "neighborhood" | "memory" | "rescue", title = clean(data.title, 80), body = clean(data.body), imageKey = clean(data.imageKey, 240);
  if (!["adoption", "neighborhood", "memory", "rescue"].includes(category) || !title || body.length < 20) return Response.json({ error: "공개할 이야기를 확인해 주세요." }, { status: 400 });
  if (privatePattern.test(`${title} ${body}`)) return Response.json({ error: "전화번호·번지·동호수처럼 정확한 개인정보는 공개 글에 적을 수 없어요." }, { status: 400 });
  if (category === "adoption") { const [{ data: completed }, { data: external }] = await Promise.all([supabase.from("applications").select("id").eq("member_id", user.userId).eq("status", "completed").limit(1), supabase.from("adoption_certifications").select("id").eq("member_id", user.userId).eq("status", "verified").limit(1)]); if (!completed?.[0] && !external?.[0]) return Response.json({ error: "인계가 완료됐거나 외부 보호소 인증을 받은 입양자만 입양 일기를 쓸 수 있어요." }, { status: 403 }); }
  if (category === "rescue") { const [{ data: member }, { data: registration }] = await Promise.all([supabase.from("members").select("role").eq("id", user.userId).limit(1), supabase.from("direct_animals").select("id").eq("member_id", user.userId).limit(1)]); if (!(["foster", "shelter", "admin"].includes(String(member?.[0]?.role)) || registration?.[0])) return Response.json({ error: "보호 이야기는 인증 보호자 또는 등록 임시보호자만 작성할 수 있어요." }, { status: 403 }); }
  const { data: post, error } = await supabase.from("posts").insert({ member_id: user.userId, category, title, body, image_key: imageKey || null }).select("*").single();
  if (error) return Response.json({ error: "이야기를 저장하지 못했어요." }, { status: 500 });
  return Response.json({ post }, { status: 201 });
}

export async function PUT(request:Request){const user=await getChatGPTUser();if(!user)return Response.json({error:"본인 확인이 필요합니다."},{status:401});const data=await request.json() as Record<string,unknown>,id=Number(data.id),title=clean(data.title,80),body=clean(data.body);if(!id||!title||body.length<20)return Response.json({error:"수정할 내용을 확인해 주세요."},{status:400});if(privatePattern.test(`${title} ${body}`))return Response.json({error:"정확한 연락처·주소·급식 장소는 공개할 수 없어요."},{status:400});const {data:row}=await getSupabaseServerClient().from("posts").update({title,body,updated_at:new Date().toISOString()}).eq("id",id).eq("member_id",user.userId).select("*").maybeSingle();if(!row)return Response.json({error:"수정 권한이 없습니다."},{status:404});return Response.json({post:row})}
export async function DELETE(request:Request){const user=await getChatGPTUser();if(!user)return Response.json({error:"본인 확인이 필요합니다."},{status:401});const id=Number(new URL(request.url).searchParams.get("id"));const {count}=await getSupabaseServerClient().from("posts").delete({count:"exact"}).eq("id",id).eq("member_id",user.userId);return count?Response.json({deleted:true}):Response.json({error:"삭제 권한이 없습니다."},{status:404})}
export async function PATCH(request:Request){const data=await request.json() as Record<string,unknown>,id=Number(data.id);if(!id)return Response.json({error:"글을 찾을 수 없습니다."},{status:400});const client=getSupabaseServerClient(),{data:row}=await client.from("posts").select("shares").eq("id",id).limit(1);if(!row?.[0])return Response.json({error:"글을 찾을 수 없습니다."},{status:404});await client.from("posts").update({shares:Number(row[0].shares||0)+1}).eq("id",id);return Response.json({shared:true})}
