import { getChatGPTUser } from "../../chatgpt-auth";
import { getSupabaseServerClient } from "../../../lib/supabase/server";
import { enforceRateLimit } from "../../../lib/api-guards";
import { isStoryReaction, storyReactionCounts, storyReactions } from "../../../lib/story-input";
const headers={"cache-control":"private, no-store"};
export async function POST(request:Request){
 if(request.headers.get("origin")&&request.headers.get("origin")!==new URL(request.url).origin)return Response.json({error:"요청 주소를 확인해 주세요."},{status:403});
 try{
 const user=await getChatGPTUser();if(!user)return Response.json({error:"로그인이 필요해요."},{status:401});
 const input=await request.json(),reaction:unknown=input.reaction??null;
 if(!Number.isSafeInteger(input.postId)||input.postId<1||(reaction!==null&&!isStoryReaction(reaction)))return Response.json({error:"이야기 정보를 확인해 주세요."},{status:400});
 if(!await enforceRateLimit("story-reaction",user.userId,60,60))return Response.json({error:"잠시 후 다시 시도해 주세요."},{status:429});
 const client=getSupabaseServerClient();
 const {data,error}=await client.rpc("set_story_reaction",{p_member:user.userId,p_post:input.postId,p_reaction:reaction});
 if(error)return Response.json({error:"반응을 저장하지 못했어요. 글이 공개 중인지 확인해 주세요."},{status:409});
 // 글마다 처음 남긴 반응만 작성자에게 알린다. 반응을 바꾸거나 다시 눌러도 알림이 쌓이지 않는다.
 // ponytail: 반응을 지웠다가 다시 남기면 한 번 더 알린다. 남용이 보이면 같은 href·회원의 알림 중복을 막는다.
 if(reaction&&!data.previous&&data.author&&data.author!==user.userId)await client.from("notifications").insert({member_id:data.author,type:"story_reaction",title:"이야기에 반응이 왔어요",body:`${user.displayName}님이 '${storyReactions[reaction]}' 반응을 남겼어요.`,href:`/stories/post-${input.postId}`});
 return Response.json({reaction:data.reaction??null,counts:storyReactionCounts(data.counts),count:Number(data.count)||0},{headers});
 }catch{return Response.json({error:"반응을 저장하지 못했어요. 다시 시도해 주세요."},{status:503,headers});}
}
