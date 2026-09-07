import { getChatGPTUser } from "../../../chatgpt-auth";
import { getSupabaseServerClient } from "../../../../lib/supabase/server";

export async function POST(request: Request) {
  if(request.headers.get("origin") && request.headers.get("origin")!==new URL(request.url).origin) return Response.json({error:"요청 주소를 확인해 주세요."},{status:403});
  const user=await getChatGPTUser(); if(!user)return Response.json({error:"로그인이 필요해요."},{status:401});
  const c=getSupabaseServerClient(), {data:member}=await c.from("members").select("role,sanctioned").eq("id",user.userId).maybeSingle();
  if(member?.role!=="admin"||member.sanctioned)return Response.json({error:"운영 권한이 필요해요."},{status:403});
  try {
    const {id}=await request.json(); if(!Number.isSafeInteger(Number(id))||Number(id)<1)return Response.json({error:"캠페인을 확인해 주세요."},{status:400});
    const {data:campaign}=await c.from("outreach_campaigns").select("channel").eq("id",id).maybeSingle();
    if(!campaign)return Response.json({error:"캠페인을 찾지 못했어요."},{status:404});
    if(campaign.channel==="email"&&(!process.env.RESEND_API_KEY||!process.env.EMAIL_FROM||!process.env.EMAIL_REPLY_TO))return Response.json({error:"이메일 발송 설정이 필요해요."},{status:422});
    let processed=0;
    // Bounded batches keep each operator request within the hosting time limit.
    for(let i=0;i<10;i++) {
      const {data,error}=await c.rpc("claim_outreach",{p_actor:user.userId,p_campaign:Number(id)});if(error)throw error;if(!data)break;
      processed++;if(data.skip)continue;
      const d=data.delivery, message=data.campaign;
      try {
        const response=await fetch("https://api.resend.com/emails",{method:"POST",signal:AbortSignal.timeout(5000),headers:{authorization:`Bearer ${process.env.RESEND_API_KEY}`,"content-type":"application/json","Idempotency-Key":`firstfriend-outreach-${d.id}`},body:JSON.stringify({from:process.env.EMAIL_FROM,to:[d.recipient],reply_to:process.env.EMAIL_REPLY_TO,subject:`(광고) ${message.title}`,text:`${message.body}\n\nhttps://www.firstfriend.me${message.href}\n\n퍼스트프렌드 | 문의: ${process.env.EMAIL_REPLY_TO}\n수신 거부: https://www.firstfriend.me/email/unsubscribe?token=${data.unsubscribe}`})});
        const result=await response.json();
        await c.from("outreach_deliveries").update({status:response.ok?"accepted":"failed",provider_id:response.ok?result.id:null,error:response.ok?null:`발송 제공자 오류 (${response.status})`}).eq("id",d.id).eq("status","processing").throwOnError();
      } catch {
        // An uncertain external send is not retried: inspect provider logs before any resend.
        await c.from("outreach_deliveries").update({status:"failed",error:"접수 여부 불명확. 발송 제공자 기록을 확인해 주세요."}).eq("id",d.id).eq("status","processing").throwOnError();
      }
    }
    await c.from("admin_audit_logs").insert({actor_id:user.userId,action:"campaign:batch",target_type:"campaigns",target_id:String(id),after_json:JSON.stringify({processed})}).throwOnError();
    return Response.json({processed,message:`${processed}건을 확인했어요. 대기 건이 있으면 다음 묶음을 처리해 주세요.`});
  } catch {return Response.json({error:"발송 기록을 확인한 뒤 다시 진행해 주세요."},{status:503});}
}
