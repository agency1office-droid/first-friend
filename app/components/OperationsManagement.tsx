"use client";
import {useState,useRef} from "react";
import {ActionButton} from "seed-design/ui/action-button";
import {DialogRoot,DialogContent,DialogBody,DialogFooter} from "seed-design/ui/dialog";
import {TextField,TextFieldInput,TextFieldTextarea} from "seed-design/ui/text-field";
import {SelectRoot,SelectTrigger,SelectContent,SelectItem} from "seed-design/ui/select";
import {Callout} from "seed-design/ui/callout";
import {operationLabels,type OperationResource,type OperationRow} from "../../lib/operations";
import styles from "./OperationsConsole.module.css";
import {useAppFeedback} from "./AppFeedback";

type Task={label:string;action:string;value?:Record<string,unknown>;fields?:string[];critical?:boolean};
function tasks(resource:OperationResource,row:OperationRow|null):Task[]{
  if(resource==="campaigns"&&!row)return [{label:"캠페인 작성",action:"create",fields:["title","body","channel","audience","href"]}];
  if(!row)return [];
  if(resource==="members")return row.role==="admin"?[]:[{label:"회원 정보 수정",action:"profile",fields:["display_name","home_region"]},{label:row.sanctioned?"이용 제한 해제":"이용 제한",action:row.sanctioned?"restore":"suspend",critical:true},{label:"모든 기기 로그아웃",action:"sessions",critical:true}];
  if(["posts","questions","answers","drawings","updates"].includes(resource))return [{label:"내용 수정",action:"edit",fields:resource==="answers"?["body"]:["title","body"]},{label:row.hidden?"다시 공개":"숨기기",action:"visibility",value:{hidden:!row.hidden},critical:!row.hidden}];
  if(resource==="shelters")return [{label:"보호소 정보 수정",action:"edit",fields:["name","region","introduction"]}];
  if(resource==="tickets")return [{label:"답변하기",action:"reply",fields:["reply"]},...(["open","closed"].filter(s=>s!==row.status).map(status=>({label:status==="closed"?"문의 종료":"다시 접수",action:"status",value:{status}})))];
  if(resource==="campaigns")return row.status==="draft"?[{label:"초안 수정",action:"edit",fields:["title","body","channel","audience","href"]},{label:"수신 동의 회원 발송 준비",action:"queue"},{label:"캠페인 취소",action:"cancel",critical:true}]:row.status==="queued"?[{label:"다음 10건 발송",action:"dispatch"},{label:"남은 발송 취소",action:"cancel",critical:true}]:[];
  const statusOptions:Partial<Record<OperationResource,string[]>>={reports:["open","resolved","closed"],volunteers:["open","closed"],volunteerApplications:["accepted","declined","completed"],lost:["active","resolved","closed"],support:["contacted","closed"]};
  return (statusOptions[resource]||[]).filter(status=>status!==row.status).map(status=>({label:operationLabels[status]||status,action:"status",value:{status},critical:["closed","rejected"].includes(status)}));
}
export function OperationsManagement({resource,row,onDone}:{resource:OperationResource;row:OperationRow|null;onDone:()=>void}){
  const feedback=useAppFeedback();
  const [task,setTask]=useState<Task|null>(null),[values,setValues]=useState<Record<string,string>>({}),[note,setNote]=useState(""),[error,setError]=useState(""),[pending,setPending]=useState(false);
  const lock=useRef(false),key=useRef("");
  function open(next:Task){setTask(next);setNote("");setError("");setValues(Object.fromEntries((next.fields||[]).map(field=>[field,String(row?.[field]??(field==="body"?row?.description:undefined)??({channel:"notification",audience:"all",href:"/mypage"}[field]||""))])));key.current=crypto.randomUUID();}
  async function save(){if(lock.current||!task)return;lock.current=true;setPending(true);setError("");try{
    const response=await fetch(task.action==="dispatch"?"/api/operations/outreach":"/api/operations/manage",{method:"POST",headers:{"content-type":"application/json","idempotency-key":key.current},body:JSON.stringify({resource,id:row?.id,action:task.action,value:{...task.value,...values},expected:row,note})});
    const result=await response.json();if(!response.ok)throw new Error(result.error||"처리하지 못했어요.");feedback.success(result.message||"변경 내용을 저장했어요.");setTask(null);onDone();
  }catch(e){setError(e instanceof Error?e.message:"연결을 확인해 주세요.");}finally{lock.current=false;setPending(false);}}
  return <><div className={styles.actions}>{tasks(resource,row).map(item=><ActionButton key={item.label} variant="neutralWeak" size="small" onClick={()=>open(item)}>{item.label}</ActionButton>)}</div>
    <DialogRoot open={!!task} onOpenChange={open=>{if(!open&&!lock.current)setTask(null);}}><DialogContent title={task?.label||"처리 확인"} showCloseButton={!pending}><DialogBody><div className={styles.detail}>
      <Callout tone={task?.critical?"warning":"informative"} description={resource==="campaigns"?"마케팅 수신에 동의한 회원만 대상이에요. 이메일은 주소 인증도 확인해요. 접수 완료는 실제 도착을 뜻하지 않아요.":`대상 ${row?.id||"새 항목"}의 내용을 확인해 주세요. 변경 사유가 운영 기록에 남아요.`}/>
      {task?.fields?.map(field=>["channel","audience"].includes(field)?<SelectRoot key={field} label={operationLabels[field]} value={[values[field]]} onValueChange={v=>{setValues({...values,[field]:v[0]});key.current=crypto.randomUUID();}}><SelectTrigger/><SelectContent>{(field==="channel"?["notification","email"]:["all","member","shelter","foster","veterinarian"]).map(v=><SelectItem key={v} value={v} label={v==="email"?"이메일":operationLabels[v]||v}/>)}</SelectContent></SelectRoot>:<TextField key={field} label={operationLabels[field]||field} required><TextFieldTextarea disabled={pending} value={values[field]||""} maxLength={["body","reply","introduction"].includes(field)?5000:120} onChange={e=>{setValues({...values,[field]:e.target.value});key.current=crypto.randomUUID();}}/></TextField>)}
      <TextField label="처리 사유" required><TextFieldInput disabled={pending} maxLength={500} value={note} onChange={e=>{setNote(e.target.value);key.current=crypto.randomUUID();}}/></TextField>
      {error&&<Callout tone="critical" description={error}/>}</div></DialogBody><DialogFooter><ActionButton variant="neutralWeak" disabled={pending} onClick={()=>setTask(null)}>취소</ActionButton><ActionButton variant={task?.critical?"criticalSolid":"neutralSolid"} disabled={pending||note.trim().length<2} onClick={save}>{pending?"처리 중":"확인하고 적용"}</ActionButton></DialogFooter></DialogContent></DialogRoot></>;
}
