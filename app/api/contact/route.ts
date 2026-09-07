import {getChatGPTUser} from "../../chatgpt-auth";
import {getSupabaseServerClient} from "../../../lib/supabase/server";
import {beginIdempotentRequest,completeIdempotentRequest} from "../../../lib/api-guards";
export async function GET(){
  const user=await getChatGPTUser();if(!user)return Response.json({error:"로그인이 필요해요."},{status:401});
  const c=getSupabaseServerClient();
  const [preferences,tickets]=await Promise.all([c.from("contact_preferences").select("marketing_email,marketing_notification,updated_at").eq("member_id",user.userId).maybeSingle(),c.from("support_tickets").select("id,title,body,reply,status,created_at").eq("member_id",user.userId).order("created_at",{ascending:false}).limit(50)]);
  if(preferences.error||tickets.error)return Response.json({error:"문의 기능을 준비하고 있어요. 잠시 후 확인해 주세요."},{status:503});
  return Response.json({preferences:preferences.data||{marketing_email:false,marketing_notification:false},tickets:tickets.data||[]},{headers:{"cache-control":"no-store"}});
}
export async function POST(request:Request){
  if(request.headers.get("origin")&&request.headers.get("origin")!==new URL(request.url).origin)return Response.json({error:"요청 주소를 확인해 주세요."},{status:403});
  const user=await getChatGPTUser();if(!user)return Response.json({error:"로그인이 필요해요."},{status:401});
  try{
    const body=await request.clone().json(), c=getSupabaseServerClient();
    if(body.action==="preferences"){
      if(typeof body.email!=="boolean"||typeof body.notification!=="boolean")return Response.json({error:"수신 여부를 확인해 주세요."},{status:400});
      await c.rpc("set_contact_preferences",{p_member:user.userId,p_email:body.email,p_notification:body.notification,p_source:"member-settings"}).throwOnError();
    }else if(body.action==="ticket"){
      if(typeof body.title!=="string"||body.title.trim().length<2||body.title.length>120||typeof body.body!=="string"||body.body.trim().length<10||body.body.length>2000)return Response.json({error:"제목과 10자 이상의 문의 내용을 입력해 주세요."},{status:400});
      const guard=await beginIdempotentRequest("contact-ticket",user.userId,request,JSON.stringify(body));
      if(guard.kind==="replay"||guard.kind==="conflict")return guard.response;
      if(guard.kind!=="started")return Response.json({error:"화면을 새로 열어 주세요."},{status:400});
      await c.from("support_tickets").insert({member_id:user.userId,title:body.title.trim(),body:body.body.trim()}).throwOnError();
      await completeIdempotentRequest(guard,{ok:true},200);
    }else return Response.json({error:"요청을 확인해 주세요."},{status:400});
    return Response.json({ok:true});
  }catch{return Response.json({error:"저장 결과를 확인하지 못했어요. 문의 목록을 다시 확인해 주세요."},{status:503});}
}
