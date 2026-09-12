"use client";
import {useRef,useState} from "react";
import {useRouter} from "next/navigation";
import {ActionButton} from "seed-design/ui/action-button";
import {DialogRoot,DialogContent,DialogBody,DialogFooter} from "seed-design/ui/dialog";
import {TextField,TextFieldTextarea} from "seed-design/ui/text-field";
import {useAppFeedback} from "./AppFeedback";
// 운영 콘솔과 같은 /api/operations 조치를 글 화면에서 바로 실행한다. 처리 사유는 감사 기록에 남는다.
const choices={
 hide:{label:"숨기기",action:"post-visibility",title:"이 이야기를 숨길까요?",description:"목록과 검색에서 사라지고 작성자도 수정할 수 없어요. 운영 콘솔에서 복구할 수 있어요.",done:"이야기를 숨겼어요"},
 remove:{label:"삭제",action:"post-delete",title:"이 이야기를 삭제할까요?",description:"삭제하면 목록과 작성자 화면에서 모두 사라져요.",done:"이야기를 삭제했어요"},
} as const;
type Choice=keyof typeof choices;
export function StoryAdminActions({postId}:{postId:number}){
 const [choice,setChoice]=useState<Choice|null>(null),[note,setNote]=useState(""),[pending,setPending]=useState(false),[error,setError]=useState("");
 const lock=useRef(false),feedback=useAppFeedback(),router=useRouter();
 function pick(next:Choice){setNote("");setError("");setChoice(next);}
 async function submit(){
  if(!choice||lock.current||note.trim().length<2)return;lock.current=true;setPending(true);setError("");
  try{
   const r=await fetch("/api/operations",{method:"POST",headers:{"content-type":"application/json","idempotency-key":crypto.randomUUID()},body:JSON.stringify({action:choices[choice].action,id:postId,note:note.trim(),...(choice==="hide"?{hidden:true}:{})})});
   const result=await r.json();if(!r.ok)throw new Error(result.error||"처리 결과를 확인하지 못했어요.");
   feedback.success(choices[choice].done);router.push("/stories");router.refresh();
  }catch(e){setError(e instanceof Error?e.message:"연결을 확인하고 다시 시도해 주세요.");}finally{lock.current=false;setPending(false);}
 }
 return <section className="ff-story-admin" aria-label="운영자 기능"><span className="ff-kicker">운영자 기능</span>
  <div className="ff-story-actions"><ActionButton size="small" variant="neutralWeak" onClick={()=>pick("hide")}>숨기기</ActionButton><ActionButton size="small" variant="criticalSolid" onClick={()=>pick("remove")}>삭제</ActionButton></div>
  <DialogRoot open={Boolean(choice)} onOpenChange={(open)=>{if(!open&&!pending)setChoice(null);}}>{choice&&<DialogContent title={choices[choice].title} description={choices[choice].description}><DialogBody><TextField label="처리 사유"><TextFieldTextarea value={note} maxLength={500} onChange={e=>setNote(e.target.value)} placeholder="2자 이상 적어 주세요. 처리 기록에 남아요."/></TextField>{error&&<p role="alert">{error}</p>}</DialogBody><DialogFooter><ActionButton variant="neutralWeak" disabled={pending} onClick={()=>setChoice(null)}>취소</ActionButton><ActionButton variant="criticalSolid" disabled={pending||note.trim().length<2} onClick={submit}>{choices[choice].label}</ActionButton></DialogFooter></DialogContent>}</DialogRoot>
 </section>;
}
