import { getChatGPTUser } from "../../chatgpt-auth";
import { getSupabaseServerClient } from "../../../lib/supabase/server";
import { enforceRateLimit } from "../../../lib/api-guards";
export async function POST(request:Request){
 if(request.headers.get("origin")&&request.headers.get("origin")!==new URL(request.url).origin)return Response.json({error:"요청 주소를 확인해 주세요."},{status:403});
 try{
 const user=await getChatGPTUser();if(!user)return Response.json({error:"로그인이 필요해요."},{status:401});
 const input=await request.json();if(!Number.isSafeInteger(input.postId)||input.postId<1||typeof input.active!=="boolean")return Response.json({error:"이야기 정보를 확인해 주세요."},{status:400});
 if(!await enforceRateLimit("story-reaction",user.userId,60,60))return Response.json({error:"잠시 후 다시 시도해 주세요."},{status:429});
 const {data,error}=await getSupabaseServerClient().rpc("set_story_reaction",{p_member:user.userId,p_post:input.postId,p_active:input.active});
 if(error)return Response.json({error:"응원을 저장하지 못했어요. 글이 공개 중인지 확인해 주세요."},{status:409});
 return Response.json(data,{headers:{"cache-control":"private, no-store"}});
 }catch{return Response.json({error:"응원을 저장하지 못했어요. 다시 시도해 주세요."},{status:503});}
}
