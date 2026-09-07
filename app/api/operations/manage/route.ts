import { getChatGPTUser } from "../../../chatgpt-auth";
import { getSupabaseServerClient } from "../../../../lib/supabase/server";
import { operationResources, type OperationResource } from "../../../../lib/operations";
import { beginIdempotentRequest, completeIdempotentRequest } from "../../../../lib/api-guards";
import { safeReturnTo } from "../../../../lib/app-auth";

export async function POST(request: Request) {
  if (request.headers.get("origin") && request.headers.get("origin") !== new URL(request.url).origin) return Response.json({error:"요청 주소를 확인해 주세요."},{status:403});
  const user=await getChatGPTUser(); if(!user) return Response.json({error:"로그인이 필요해요."},{status:401});
  const c=getSupabaseServerClient();
  const {data:member}=await c.from("members").select("role,sanctioned").eq("id",user.userId).maybeSingle();
  if(member?.role!=="admin"||member.sanctioned) return Response.json({error:"운영 권한이 필요해요."},{status:403});
  try {
    const body=await request.clone().json();
    const {resource,id,action,value,expected,note}=body;
    if(!Object.hasOwn(operationResources,resource)||typeof action!=="string"||typeof note!=="string"||note.trim().length<2||note.length>500||!value||typeof value!=="object"||Array.isArray(value)) return Response.json({error:"입력 내용을 확인해 주세요."},{status:400});
    const config=operationResources[resource as OperationResource];
    if(action!=="create" && (!expected || typeof expected!=="object" || String(expected.id)!==String(id) || config.fields.split(",").some(key=>!Object.hasOwn(expected,key)))) return Response.json({error:"목록을 새로 불러와 주세요."},{status:400});
    if(action==="create" && resource!=="campaigns") return Response.json({error:"지원하지 않는 작성 기능이에요."},{status:400});
    if(resource==="campaigns"&&["create","edit"].includes(action)&& (typeof value.href!=="string"||safeReturnTo(value.href)!==value.href||value.href.length>500))return Response.json({error:"연결할 서비스 내부 주소를 확인해 주세요."},{status:400});
    if(resource==="campaigns" && action==="queue") {
      if(expected.channel==="email" && (!process.env.RESEND_API_KEY||!process.env.EMAIL_FROM||!process.env.EMAIL_REPLY_TO)) return Response.json({error:"이메일 발송 키·보낸 사람·회신 주소를 먼저 연결해 주세요. 초안은 보관되어 있어요."},{status:422});
    }
    const guard=await beginIdempotentRequest("operations-manage",user.userId,request,JSON.stringify(body));
    if(guard.kind==="replay"||guard.kind==="conflict") return guard.response;
    if(guard.kind!=="started") return Response.json({error:"화면을 새로 열어 주세요."},{status:400});
    let row,error;
    if(action==="create") {
      if(typeof value.title!=="string"||value.title.trim().length<2||value.title.length>120||typeof value.body!=="string"||value.body.trim().length<2||value.body.length>5000||!["email","notification"].includes(value.channel)||!["all","member","shelter","foster","veterinarian"].includes(value.audience)||typeof value.href!=="string"||safeReturnTo(value.href)!==value.href) return Response.json({error:"제목·본문·대상·내부 연결 주소를 확인해 주세요."},{status:400});
      const result=await c.rpc("create_outreach",{p_actor:user.userId,p_title:value.title.trim(),p_body:value.body.trim(),p_channel:value.channel,p_audience:value.audience,p_href:value.href,p_note:note}); row=result.data;error=result.error;
    } else {
      const result=await c.rpc(["publicAnimals","registrations"].includes(resource)?"manage_animal":"manage_operation",{p_actor:user.userId,p_resource:resource,p_id:String(id),p_action:action,p_value:value,p_expected:Object.fromEntries(config.fields.split(",").map(key=>[key,expected[key]])),p_note:note});row=result.data;error=result.error;
    }
    const status=error ? error.code==="42501"?403:error.code==="40001"?409:error.code==="P0002"?404:error.code==="P0001"?400:503 : 200;
    const result=error?{error:status===503?"기능을 준비하지 못했어요. 운영 상태에서 데이터베이스 연결을 확인해 주세요.":error.message}:{row};
    await completeIdempotentRequest(guard,result,status);
    return Response.json(result,{status});
  } catch { return Response.json({error:"처리 결과를 확인하지 못했어요. 목록과 처리 기록을 확인해 주세요."},{status:503}); }
}
