import { getChatGPTUser } from '../../chatgpt-auth';
import { getSupabaseServerClient } from '../../../lib/supabase/server';
import { readJson, ownedUploadKey } from '../_helpers';
import { storyInput } from '../../../lib/story-input';
import { getStoryPage } from '../../../lib/stories';
import { enforceRateLimit } from '../../../lib/api-guards';

const headers={'cache-control':'private, no-store'};
const reply=(error:string,status:number)=>Response.json({error},{status,headers});
function sameOrigin(request:Request){return !request.headers.get('origin')||request.headers.get('origin')===new URL(request.url).origin;}
export async function GET(request:Request) {
 try {
  const params=new URL(request.url).searchParams;
  const user=params.get('mine')==='1'?await getChatGPTUser():null;
  if(params.get('mine')==='1'&&!user)return reply('로그인하고 내 글을 확인해 주세요.',401);
  return Response.json(await getStoryPage(params,user?.userId),{headers});
 }catch {return reply('이야기를 불러오지 못했어요. 검색 조건을 확인하고 다시 시도해 주세요.',503);}
}
async function write(request:Request,editing:boolean){
 if(!sameOrigin(request))return reply('요청 주소를 확인해 주세요.',403);
 try{
  const user=await getChatGPTUser();if(!user)return reply('로그인하고 이야기를 써 주세요.',401);
  const data=await readJson(request);if(!data)return reply('글 내용을 확인해 주세요.',400);
  let input;try{input=storyInput(data);}catch(e){return reply((e as Error).message,400);}
  const c=getSupabaseServerClient();
  const id=Number(data.id);
  const {data:before,error:readError}=editing?await c.from('posts').select('*').eq('id',id).eq('member_id',user.userId).neq('status','deleted').maybeSingle():{data:null,error:null};
  if(readError)throw readError;
  if(editing&&!before)return reply('수정할 이야기를 찾지 못했어요.',404);
  if(before?.hidden)return reply('운영자가 확인 중인 글이에요. 검토 후 수정할 수 있어요.',403);
  if(editing&&(!Number.isSafeInteger(data.revision)||data.revision!==before.revision))return reply('다른 화면에서 수정한 내용이 있어요. 새로고침 후 확인해 주세요.',409);
  if(!await enforceRateLimit('story-write',user.userId,3600,120))return reply('저장이 많아 잠시 쉬고 있어요. 잠시 후 다시 시도해 주세요.',429);
  // Legacy public photos may only be retained on the same existing post.
  const modern=input.image_keys.filter(k=>k.startsWith('story-media/'));
  const legacy=input.image_keys.filter(k=>!k.startsWith('story-media/'));
  if(legacy.some(k=>!before?.image_keys?.includes(k)||!ownedUploadKey(k,user.userId,['public-media','uploads'])))return reply('이 글에 등록된 사진만 사용할 수 있어요.',400);
  if(modern.length){
   const ids=modern.map(k=>k.slice(12));if(ids.some(k=>!/^[0-9a-f-]{36}$/i.test(k)))return reply('사진 정보를 확인해 주세요.',400);
   const {data:photos,error}=await c.from('post_media').select('id').eq('member_id',user.userId).in('id',ids);
   if(error)throw error;if(photos?.length!==modern.length)return reply('본인이 올린 사진만 사용할 수 있어요.',403);
  }
  if(input.status==='published'){
   if(input.category==='adoption'){
    const [a,b]=await Promise.all([c.from('applications').select('id').eq('member_id',user.userId).eq('status','completed').limit(1),c.from('adoption_certifications').select('id').eq('member_id',user.userId).eq('status','verified').limit(1)]);
    if(a.error||b.error)throw a.error||b.error;
    if(!a.data?.length&&!b.data?.length)return reply('입양 일기는 입양이 확인된 회원이 쓸 수 있어요. 오늘의 일상에 기록해 주세요.',403);
   }
   if(input.category==='rescue'){
    const [a,b]=await Promise.all([c.from('members').select('role,verified').eq('id',user.userId).single(),c.from('direct_animals').select('id').eq('member_id',user.userId).eq('status','published').limit(1)]);
    if(a.error||b.error)throw a.error||b.error;
    if(!(a.data?.role==='admin'||(['shelter','foster'].includes(a.data?.role)&&a.data?.verified)||b.data?.length))return reply('보호 이야기는 인증된 보호자가 쓸 수 있어요. 오늘의 일상에 기록해 주세요.',403);
   }
  }
  const now=new Date().toISOString(),values={...input,updated_at:now,published_at:input.status==='published'?(before?.published_at||now):null};
  if(editing){
   const {data:post,error}=await c.from('posts').update({...values,revision:before.revision+1}).eq('id',id).eq('member_id',user.userId).eq('revision',data.revision).eq('hidden',false).select('*').maybeSingle();
   if(error)throw error;if(!post)return reply('글 상태가 바뀌었어요. 새로고침 후 확인해 주세요.',409);
   return Response.json({post},{headers});
  }
  const clientKey=String(data.clientKey||'');if(!/^[0-9a-f]{8}-[0-9a-f-]{27}$/i.test(clientKey))return reply('작성 화면을 새로 열어 주세요.',400);
  const {data:existing,error:existingError}=await c.from('posts').select('*').eq('member_id',user.userId).eq('client_key',clientKey).maybeSingle();
  if(existingError)throw existingError;
  if(existing){
   if(existing.status!==input.status||existing.title!==input.title||existing.body!==input.body||existing.category!==input.category||JSON.stringify(existing.image_keys)!==JSON.stringify(input.image_keys))return reply('이미 저장된 글이에요. 내 글에서 이어서 수정해 주세요.',409);
   return Response.json({post:existing},{headers});
  }
  if(!await enforceRateLimit('story-create',user.userId,3600,20))return reply('글은 한 시간에 20개까지 저장할 수 있어요.',429);
  const {data:post,error}=await c.from('posts').insert({...values,member_id:user.userId,client_key:clientKey}).select('*').single();
  if(error){if(error.code==='23505')return reply('저장 중인 글이에요. 잠시 후 다시 확인해 주세요.',409);throw error;}
  return Response.json({post},{status:201,headers});
 }catch{return reply('글을 저장하지 못했어요. 작성한 내용은 유지돼요. 다시 시도해 주세요.',503);}
}
export async function POST(request:Request){return write(request,false);}
export async function PUT(request:Request){return write(request,true);}
export async function DELETE(request:Request){
 if(!sameOrigin(request))return reply('요청 주소를 확인해 주세요.',403);
 try{
  const user=await getChatGPTUser();if(!user)return reply('로그인이 필요해요.',401);
  const params=new URL(request.url).searchParams,id=Number(params.get('id')),revision=Number(params.get('revision'));
  if(!Number.isSafeInteger(id)||id<1||!Number.isSafeInteger(revision)||revision<1)return reply('삭제할 글을 확인해 주세요.',400);
  const {data,error}=await getSupabaseServerClient().from('posts').update({status:'deleted',revision:revision+1,updated_at:new Date().toISOString()}).eq('id',id).eq('member_id',user.userId).eq('revision',revision).neq('status','deleted').select('id').maybeSingle();
  if(error)throw error;if(!data)return reply('글을 찾지 못했거나 다른 화면에서 변경됐어요. 새로고침해 주세요.',409);
  return Response.json({deleted:true},{headers});
 }catch{return reply('글을 삭제하지 못했어요. 다시 시도해 주세요.',503);}
}
