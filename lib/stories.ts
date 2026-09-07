import { getSupabaseServerClient } from './supabase/server';
import { storyCategories, storyImageUrl, storyPageSize, storyQuery } from './story-input';
export type PublicStory={id:string;postId:number;category:string;categoryKey:string;title:string;body:string;author:string;authorId:string;image:string;images:string[];imageKeys:string[];reactions:number;shares:number;views:number;popularity:number;createdAt:string;status:string;hidden:boolean;revision:number};
const fields='id,member_id,category,title,body,image_key,image_keys,status,hidden,revision,reaction_count,published_at,created_at,updated_at,members(display_name)';
function map(row:Record<string,unknown>):PublicStory {
 const keys=(Array.isArray(row.image_keys)?row.image_keys:row.image_key?[row.image_key]:[]) as string[];
 const member=row.members as {display_name?:string}|null;
 return {id:`post-${row.id}`,postId:Number(row.id),category:storyCategories[row.category as keyof typeof storyCategories]||String(row.category),categoryKey:String(row.category),title:String(row.title||''),body:String(row.body||''),author:member?.display_name||'퍼스트프렌드 회원',authorId:String(row.member_id),image:keys[0]?storyImageUrl(keys[0],true):'',images:keys.map(k=>storyImageUrl(k)),imageKeys:keys,reactions:Number(row.reaction_count||0),shares:0,views:0,popularity:Number(row.reaction_count||0),createdAt:String(row.published_at||row.created_at),status:String(row.status),hidden:Boolean(row.hidden),revision:Number(row.revision)};
}
export async function getStoryPage(params=new URLSearchParams(),memberId?:string) {
 const input=storyQuery(params),client=getSupabaseServerClient();
 let query=client.from('posts').select(fields,{count:'exact'});
 if(memberId)query=query.eq('member_id',memberId).neq('status','deleted');
 else query=query.eq('status','published').eq('hidden',false);
 if(input.category)query=query.eq('category',input.category);
 if(input.author)query=query.eq('member_id',input.author);
 if(input.q)query=query.ilike('title','%'+input.q.replace(/[\\%_]/g,'\\$&')+'%');
 if(memberId&&params.get('status')==='draft')query=query.eq('status','draft');
 if(memberId&&params.get('status')==='published')query=query.eq('status','published');
 if(input.sort==='cheers')query=query.order('reaction_count',{ascending:false});
 const {data,count,error}=await query.order(memberId?'updated_at':'published_at',{ascending:false}).order('id',{ascending:false}).range((input.page-1)*storyPageSize,input.page*storyPageSize-1);
 if(error)throw error;
 return {stories:(data||[]).map(map),total:count||0,page:input.page,pageSize:storyPageSize};
}
export async function getStories(){return (await getStoryPage()).stories;}
export async function getStory(id:string,ownerId?:string){
 const number=Number(id.replace(/^post-/,''));if(!Number.isSafeInteger(number)||number<1)return null;
 let query=getSupabaseServerClient().from('posts').select(fields).eq('id',number);
 query=ownerId?query.eq('member_id',ownerId).neq('status','deleted'):query.eq('status','published').eq('hidden',false);
 const {data,error}=await query.maybeSingle();if(error)throw error;return data?map(data):null;
}
