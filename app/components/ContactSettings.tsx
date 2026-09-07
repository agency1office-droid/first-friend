"use client";
import {useEffect,useState,useRef} from "react";
import {ActionButton} from "seed-design/ui/action-button";
import {Checkbox} from "seed-design/ui/checkbox";
import {TextField,TextFieldInput,TextFieldTextarea} from "seed-design/ui/text-field";
import {Callout} from "seed-design/ui/callout";
export function ContactSettings(){
  const [email,setEmail]=useState(false),[notification,setNotification]=useState(false),[ready,setReady]=useState(false),[tickets,setTickets]=useState<{id:number;title:string;body:string;reply:string;status:string}[]>([]),[title,setTitle]=useState(""),[body,setBody]=useState(""),[message,setMessage]=useState(""),[error,setError]=useState(""),[pending,setPending]=useState(false),[version,setVersion]=useState(0);
  const lock=useRef(false),key=useRef("");
  useEffect(()=>{const c=new AbortController();fetch('/api/contact',{signal:c.signal}).then(async r=>{const data=await r.json();if(!r.ok)throw new Error(data.error);return data;}).then(data=>{setEmail(data.preferences.marketing_email);setNotification(data.preferences.marketing_notification);setTickets(data.tickets);setReady(true);}).catch(e=>{if(!c.signal.aborted)setError(e.message);});return()=>c.abort();},[version]);
  async function save(action:string){if(lock.current)return;lock.current=true;setPending(true);setError("");setMessage("");if(!key.current)key.current=crypto.randomUUID();try{const r=await fetch('/api/contact',{method:'POST',headers:{'content-type':'application/json','idempotency-key':key.current},body:JSON.stringify({action,email,notification,title,body})});const data=await r.json();if(!r.ok)throw new Error(data.error);setMessage(action==='ticket'?'문의를 접수했어요. 이 페이지에서 답변을 확인해 주세요.':'수신 설정을 저장했어요.');if(action==='ticket'){setTitle('');setBody('');key.current='';}setVersion(v=>v+1);}catch(e){setError(e instanceof Error?e.message:'연결을 확인해 주세요.');}finally{lock.current=false;setPending(false);}}
  return <div style={{display:'grid',gap:'var(--seed-dimension-x5)'}}>{error&&<Callout tone="critical" description={error}/>} {message&&<Callout tone="positive" description={message}/>}
    <h2>혜택·소식 수신 설정</h2><p>선택 동의예요. 동의하지 않아도 서비스를 이용할 수 있고 언제든 철회할 수 있어요. 입양·문의에 필요한 서비스 알림은 별도로 전달해요.</p>
    <Checkbox checked={email} onCheckedChange={setEmail} disabled={!ready||pending} label="이메일로 마케팅 소식 받기"/>
    <Checkbox checked={notification} onCheckedChange={setNotification} disabled={!ready||pending} label="앱 알림으로 마케팅 소식 받기"/>
    <ActionButton variant="neutralWeak" disabled={!ready||pending} onClick={()=>save('preferences')}>수신 설정 저장</ActionButton>
    <h2>운영자에게 문의하기</h2><TextField label="제목"><TextFieldInput value={title} maxLength={120} onChange={e=>{setTitle(e.target.value);key.current='';}}/></TextField><TextField label="문의 내용"><TextFieldTextarea value={body} maxLength={2000} onChange={e=>{setBody(e.target.value);key.current='';}}/></TextField><ActionButton disabled={!ready||pending||title.trim().length<2||body.trim().length<10} variant="neutralSolid" onClick={()=>save('ticket')}>{pending?'저장 중':'문의 접수'}</ActionButton>
    <h2>나의 문의</h2>{tickets.length===0?<p>접수한 문의가 없어요.</p>:tickets.map(ticket=><section key={ticket.id} className="ff-result"><h3>{ticket.title}</h3><p>{ticket.body}</p><p>{ticket.reply||'답변을 기다리고 있어요.'}</p></section>)}
  </div>;
}
