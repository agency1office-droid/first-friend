"use client";
/* eslint-disable @next/next/no-img-element */
import {useRef,useState} from "react";
import {ActionButton} from "seed-design/ui/action-button";
import {ReactionButton} from "seed-design/ui/reaction-button";
import {DialogRoot,DialogContent,DialogBody,DialogFooter} from "seed-design/ui/dialog";
import {TextField,TextFieldTextarea} from "seed-design/ui/text-field";
import {storyReactionCounts,storyReactionKinds,storyReactions,type StoryReaction} from "../../lib/story-input";
import {useAppFeedback} from "./AppFeedback";
import {LoginBottomSheet} from "./LoginSheet";
type Counts=Record<StoryReaction,number>;
type Choice=StoryReaction|null;
// 서버가 확인한 수 위에 아직 확정되지 않은 선택 변경을 얹어 보여 준다.
function project(counts:Counts,confirmed:Choice,desired:Choice){
 const next={...counts};if(confirmed)next[confirmed]=Math.max(0,next[confirmed]-1);if(desired)next[desired]+=1;return next;
}
export function StoryActions({postId,initialCounts,initialReaction=null,signedIn=false,returnTo}:{postId:number;initialCounts:Counts;initialReaction?:Choice;signedIn?:boolean;returnTo:string}){
 const [selected,setSelected]=useState<Choice>(initialReaction),[counts,setCounts]=useState(initialCounts),[open,setOpen]=useState(false),[loginOpen,setLoginOpen]=useState(false),[reason,setReason]=useState(""),[reported,setReported]=useState(false),[pending,setPending]=useState(false),[error,setError]=useState("");
 const reaction=useRef({desired:initialReaction as Choice,confirmed:initialReaction as Choice,counts:initialCounts,version:0,running:false}),reportLock=useRef(false),feedback=useAppFeedback();
 // 로그인 전이거나 세션이 끝났으면 화면을 떠나지 않고 로그인 시트를 연다.
 function askLogin(){setOpen(false);setLoginOpen(true);}
 function showReaction(){
 const state=reaction.current;setSelected(state.desired);setCounts(project(state.counts,state.confirmed,state.desired));
 }
 async function react(kind:StoryReaction){
 if(!signedIn){askLogin();return;}
 const state=reaction.current;state.desired=state.desired===kind?null:kind;state.version++;showReaction();
 if(state.running)return;state.running=true;
 try{
 while(true){
 const version=state.version,target=state.desired;
 try{
 const r=await fetch("/api/reactions",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({postId,reaction:target})});
 if(r.status===401){state.desired=state.confirmed;showReaction();askLogin();return;}
 const result=await r.json();if(!r.ok)throw new Error(result.error);
 state.confirmed=result.reaction??null;state.counts=storyReactionCounts(result.counts);
 }catch{
 if(version===state.version){state.desired=state.confirmed;feedback.error("반응을 저장하지 못했어요. 다시 시도해 주세요.");}
 }
 // An older response may update the counts, but must never replace a newer click.
 showReaction();if(version===state.version)break;
 }
 }finally{state.running=false;}
 }
 async function report(){
 if(reportLock.current||reason.trim().length<10)return;reportLock.current=true;setPending(true);setError("");
 try{const r=await fetch("/api/reports",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({targetType:"post",targetId:String(postId),reason})});if(r.status===401){askLogin();return;}const result=await r.json();if(!r.ok)throw new Error(result.error);setReported(true);setOpen(false);feedback.success("신고를 접수했어요");}catch(e){setError(e instanceof Error?e.message:"다시 시도해 주세요.");}finally{reportLock.current=false;setPending(false);}
 }
 async function share(){try{if(navigator.share)await navigator.share({title:document.title,url:location.href});else{await navigator.clipboard.writeText(location.href);feedback.success("이야기 링크를 복사했어요");}}catch(e){if(!(e instanceof DOMException&&e.name==="AbortError"))feedback.error("공유하지 못했어요. 주소를 복사해 주세요.");}}
 return <>
 <div className="ff-story-reactions" role="group" aria-label="이야기에 반응 남기기">{storyReactionKinds.map(kind=><ReactionButton key={kind} size="small" pressed={selected===kind} onClick={()=>react(kind)}><img src={`/reactions/${kind}.svg`} alt="" width={20} height={20}/>{storyReactions[kind]} {counts[kind]}</ReactionButton>)}</div>
 <div className="ff-story-actions"><ActionButton size="small" variant="neutralWeak" onClick={share}>공유</ActionButton><ActionButton size="small" variant="neutralWeak" disabled={reported} onClick={()=>signedIn?setOpen(true):askLogin()}>{reported?"접수됨":"신고"}</ActionButton><DialogRoot open={open} onOpenChange={(open)=>{if(!pending)setOpen(open);}}><DialogContent title="이 이야기를 신고할까요?" description="운영자가 글과 신고 사유를 검토해요."><DialogBody><TextField label="신고 사유"><TextFieldTextarea value={reason} maxLength={500} onChange={e=>setReason(e.target.value)} placeholder="10자 이상 적어 주세요."/></TextField>{error&&<p role="alert">{error}</p>}</DialogBody><DialogFooter><ActionButton variant="neutralWeak" disabled={pending} onClick={()=>setOpen(false)}>취소</ActionButton><ActionButton variant="criticalSolid" disabled={pending||reason.trim().length<10} onClick={report}>신고 접수</ActionButton></DialogFooter></DialogContent></DialogRoot></div>
 <LoginBottomSheet open={loginOpen} onOpenChange={setLoginOpen} returnTo={returnTo} title="퍼스트프렌드 로그인" description="반응과 신고는 로그인 후 남길 수 있어요"/>
 </>;
}
