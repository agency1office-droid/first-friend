import {getSupabaseServerClient} from "../../../../lib/supabase/server";
export async function POST(request:Request){
  if(request.headers.get("origin")&&request.headers.get("origin")!==new URL(request.url).origin)return new Response('요청 주소를 확인해 주세요.',{status:403});
  try{const token=(await request.formData()).get('token');if(typeof token!=='string'||! /^[0-9a-f-]{36}$/i.test(token))return new Response('수신 거부 링크를 확인해 주세요.',{status:400});
    const c=getSupabaseServerClient(),{data,error}=await c.from('contact_preferences').select('member_id,marketing_notification').eq('unsubscribe_token',token).maybeSingle();if(error)throw error;if(!data)return new Response('수신 거부 링크를 확인해 주세요.',{status:400});
    await c.rpc('set_contact_preferences',{p_member:data.member_id,p_email:false,p_notification:data.marketing_notification,p_source:'email-unsubscribe'}).throwOnError();return new Response('마케팅 이메일 수신을 중단했어요.',{headers:{'content-type':'text/plain; charset=utf-8','cache-control':'no-store'}});
  }catch{return new Response('처리하지 못했어요. 잠시 후 다시 확인해 주세요.',{status:503});}
}
