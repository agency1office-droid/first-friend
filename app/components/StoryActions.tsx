"use client";
import {useRef,useState} from "react";
import {ActionButton} from "seed-design/ui/action-button";
import {ReactionButton} from "seed-design/ui/reaction-button";
import {DialogRoot,DialogContent,DialogBody,DialogFooter} from "seed-design/ui/dialog";
import {TextField,TextFieldTextarea} from "seed-design/ui/text-field";
import {IconHeartFill,IconHeartLine} from "@karrotmarket/react-monochrome-icon";
import {useAppFeedback} from "./AppFeedback";
export function StoryActions({postId,initialCount=0,initialActive=false}:{postId:number;initialCount?:number;initialActive?:boolean}){
 const [active,setActive]=useState(initialActive),[count,setCount]=useState(initialCount),[open,setOpen]=useState(false),[reason,setReason]=useState(""),[reported,setReported]=useState(false),[pending,setPending]=useState(false),[error,setError]=useState("");
 const lock=useRef(false),reportLock=useRef(false),feedback=useAppFeedback();
 async function react(){
 if(lock.current)return;lock.current=true;const previous=active,previousCount=count;setActive(!previous);setCount(Math.max(0,count+(previous?-1:1)));
 try{const r=await fetch("/api/reactions",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({postId,active:!previous})});if(r.status===401){location.href="/login?return_to="+encodeURIComponent(location.pathname);throw new Error("ログイン");}const result=await r.json();if(!r.ok)throw new Error(result.error);setActive(result.active);setCount(result.count);}
 catch{setActive(previous);setCount(previousCount);feedback.error("응원을 저장하지 못했어요. 다시 시도해 주세요.");}finally{lock.current=false;}
 }
 async function report(){
 if(reportLock.current||reason.trim().length<10)return;reportLock.current=true;setPending(true);setError("");
 try{const r=await fetch("/api/reports",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({targetType:"post",targetId:String(postId),reason})});if(r.status===401){location.href="/login?return_to="+encodeURIComponent(location.pathname);return;}const result=await r.json();if(!r.ok)throw new Error(result.error);setReported(true);setOpen(false);feedback.success("신고를 접수했어요");}catch(e){setError(e instanceof Error?e.message:"다시 시도해 주세요.");}finally{reportLock.current=false;setPending(false);}
 }
 async function share(){try{if(navigator.share)await navigator.share({title:document.title,url:location.href});else{await navigator.clipboard.writeText(location.href);feedback.success("이야기 링크를 복사했어요");}}catch(e){if(!(e instanceof DOMException&&e.name==="AbortError"))feedback.error("공유하지 못했어요. 주소를 복사해 주세요.");}}
 return <div className="ff-story-actions"><ReactionButton pressed={active} onClick={react}>{active?<IconHeartFill/>:<IconHeartLine/>} 응원 {count}</ReactionButton><ActionButton size="small" variant="neutralWeak" onClick={share}>공유</ActionButton><ActionButton size="small" variant="neutralWeak" disabled={reported} onClick={()=>setOpen(true)}>{reported?"접수됨":"신고"}</ActionButton><DialogRoot open={open} onOpenChange={(open)=>{if(!pending)setOpen(open);}}><DialogContent title="이 이야기를 신고할까요?" description="운영자가 글과 신고 사유를 검토해요."><DialogBody><TextField label="신고 사유"><TextFieldTextarea value={reason} maxLength={500} onChange={e=>setReason(e.target.value)} placeholder="10자 이상 적어 주세요."/></TextField>{error&&<p role="alert">{error}</p>}</DialogBody><DialogFooter><ActionButton variant="neutralWeak" disabled={pending} onClick={()=>setOpen(false)}>취소</ActionButton><ActionButton variant="criticalSolid" disabled={pending||reason.trim().length<10} onClick={report}>신고 접수</ActionButton></DialogFooter></DialogContent></DialogRoot></div>;
}

