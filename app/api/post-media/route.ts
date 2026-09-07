import { getAuthenticatedMember } from '../../chatgpt-auth';
import { getSupabaseServerClient } from '../../../lib/supabase/server';
import { enforceRateLimit } from '../../../lib/api-guards';
import { hasAllowedFileSignature } from '../../../lib/supabase/storage';

const headers={'cache-control':'private, no-store','x-content-type-options':'nosniff'};
export async function POST(request:Request){
 if(request.headers.get('origin')&&request.headers.get('origin')!==new URL(request.url).origin)return Response.json({error:'요청 주소를 확인해 주세요.'},{status:403});
 try{
  const member=await getAuthenticatedMember();if(!member)return Response.json({error:'로그인이 필요해요.'},{status:401});
  if(!await enforceRateLimit('story-photo',member.id,3600,30))return Response.json({error:'사진은 한 시간에 30장까지 올릴 수 있어요.'},{status:429});
  const form=await request.formData(),file=form.get('file');
  if(!(file instanceof File)||!['image/jpeg','image/png','image/webp'].includes(file.type)||file.size>4*1024*1024||file.size===0)return Response.json({error:'4MB 이하 JPG·PNG·WEBP 사진을 선택해 주세요.'},{status:400});
  const bytes=new Uint8Array(await file.arrayBuffer());if(!hasAllowedFileSignature(file.type,bytes))return Response.json({error:'사진 형식을 확인해 주세요.'},{status:400});
  const sharp=(await import('sharp')).default as typeof import('../../../node_modules/sharp/lib/index');
  let image:Buffer,thumb:Buffer;
  try{
   const decoded=sharp(bytes,{limitInputPixels:40_000_000,failOn:'error'}).rotate();
   [image,thumb]=await Promise.all([decoded.clone().resize({width:1200,height:1200,fit:'inside',withoutEnlargement:true}).webp({quality:80}).toBuffer(),decoded.clone().resize({width:320,height:320,fit:'cover',withoutEnlargement:true}).webp({quality:75}).toBuffer()]);
  }catch{return Response.json({error:'사진을 읽지 못했어요. 다른 사진을 선택해 주세요.'},{status:400});}
  const id=crypto.randomUUID(),object_key=member.id+'/'+id+'.webp',thumb_key=member.id+'/'+id+'-thumb.webp',c=getSupabaseServerClient(),bucket=c.storage.from('story-media');
  try{
   for(const [key,content] of [[object_key,image],[thumb_key,thumb]] as const){const {error}=await bucket.upload(key,content,{contentType:'image/webp',upsert:false});if(error)throw error;}
   const {error}=await c.from('post_media').insert({id,member_id:member.id,object_key,thumb_key});if(error)throw error;
  }catch(e){await bucket.remove([object_key,thumb_key]);throw e;}
  return Response.json({key:'story-media/'+id},{status:201,headers});
 }catch{return Response.json({error:'사진을 올리지 못했어요. 다시 시도해 주세요.'},{status:503,headers});}
}
export async function GET(request:Request){
 try{
  const params=new URL(request.url).searchParams,id=params.get('id')||'';
  if(!/^[0-9a-f-]{36}$/i.test(id))return new Response('Not found',{status:404,headers});
  const c=getSupabaseServerClient(),{data:photo,error}=await c.from('post_media').select('member_id,object_key,thumb_key').eq('id',id).maybeSingle();
  if(error)throw error;if(!photo)return new Response('Not found',{status:404,headers});
  const {data:posts,error:postError}=await c.from('posts').select('id').contains('image_keys',['story-media/'+id]).eq('status','published').eq('hidden',false).limit(1);
  if(postError)throw postError;
  if(!posts?.length){const member=await getAuthenticatedMember();if(!member||(member.id!==photo.member_id&&member.role!=='admin'))return new Response('Not found',{status:404,headers});}
  const {data,error:downloadError}=await c.storage.from('story-media').download(params.get('size')==='thumb'?photo.thumb_key:photo.object_key);
  if(downloadError||!data)throw downloadError;
  return new Response(data,{headers:{...headers,'content-type':'image/webp'}});
 }catch{return new Response('Photo unavailable',{status:503,headers});}
}
