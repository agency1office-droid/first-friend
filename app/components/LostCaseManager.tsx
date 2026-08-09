"use client";

import { useEffect, useState } from "react";
import { ActionButton } from "seed-design/ui/action-button";
import { Callout } from "seed-design/ui/callout";
import { TextField, TextFieldInput, TextFieldTextarea } from "seed-design/ui/text-field";

type CaseData = { report:{id:number;kind:string;species:string;region:string;occurredAt:string;description:string;ownershipQuestion:string;status:string}; related:Array<{id:number;kind:string;species:string;region:string;description:string}>; messages:Array<{id:number;senderId:string;body:string;createdAt:string}>; timeline:Array<{id:number;region:string;occurredAt:string;note:string}>; me:string; owner:boolean };

export function LostCaseManager({ id }:{id:number}) {
  const [data,setData]=useState<CaseData|null>(null),[error,setError]=useState("");
  async function load(){const response=await fetch(`/api/lost-found/${id}`);if(response.status===401){location.href=`/login?return_to=%2Flost-found%2F${id}`;return}const body=await response.json();if(response.ok)setData(body);else setError(body.error||"불러오지 못했어요.")}
  useEffect(()=>{let active=true;void fetch(`/api/lost-found/${id}`).then(async response=>({response,body:await response.json()})).then(({response,body})=>{if(!active)return;if(response.status===401){location.href=`/login?return_to=%2Flost-found%2F${id}`;return}if(response.ok)setData(body);else setError(body.error||"불러오지 못했어요.")});return()=>{active=false}},[id]);
  async function submit(event:React.FormEvent<HTMLFormElement>,action:string){event.preventDefault();const form=new FormData(event.currentTarget);const payload=Object.fromEntries(form.entries());const response=await fetch(`/api/lost-found/${id}`,{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({...payload,action})});const body=await response.json();if(!response.ok)setError(body.error||"저장하지 못했어요.");else{event.currentTarget.reset();await load()}}
  async function close(status:"resolved"|"closed"){await fetch(`/api/lost-found/${id}`,{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({action:"status",status})});await load()}
  if(error)return <Callout tone="critical" description={error}/>;if(!data)return <div className="ff-empty">안전한 연결 기록을 불러오는 중이에요.</div>;
  return <div className="ff-stack"><Callout tone={data.report.status==="resolved"?"positive":"informative"} title={`${data.report.species} ${data.report.kind==="lost"?"실종 신고":"발견 제보"} · ${data.report.status}`} description={`${data.report.region} · 정확한 위치와 연락처는 공개되지 않습니다.`}/>
    {data.related.length>0&&<section className="ff-result"><h2 className="ff-section-title">가능성 있는 연결</h2>{data.related.map(item=><article key={item.id} className="ff-message"><strong>{item.region} · {item.kind==="lost"?"실종":"발견"}</strong><p>{item.description}</p></article>)}</section>}
    <section className="ff-result"><h2 className="ff-section-title">비공개 메시지</h2><p className="ff-description">전화번호·집 주소를 쓰지 말고, 신고자가 소유 확인 답변을 검토한 뒤 공공장소 인계를 정하세요.</p>{data.messages.map(message=><div className="ff-message" key={message.id}><strong>{message.senderId===data.me?"나":"연결된 이용자"}</strong><p style={{whiteSpace:"pre-line"}}>{message.body}</p></div>)}<form className="ff-form" onSubmit={event=>submit(event,"message")}>{!data.owner&&<TextField label="소유 확인 질문 답변" description={data.report.ownershipQuestion}><TextFieldInput name="answer" required/></TextField>}<TextField label="안전한 메시지"><TextFieldTextarea name="body" minLength={5} required/></TextField><ActionButton>메시지 보내기</ActionButton></form></section>
    <section className="ff-result"><h2 className="ff-section-title">목격 시간선</h2>{data.timeline.map(item=><div className="ff-message" key={item.id}><strong>{item.occurredAt.replace("T"," ")} · {item.region}</strong><p>{item.note}</p></div>)}<form className="ff-form" onSubmit={event=>submit(event,"timeline")}><TextField label="대략 위치"><TextFieldInput name="region" placeholder="서울 마포구 상암동" required/></TextField><TextField label="목격 시각"><TextFieldInput type="datetime-local" name="occurredAt" required/></TextField><TextField label="목격 내용"><TextFieldTextarea name="note" minLength={5} required/></TextField><ActionButton variant="neutralWeak">시간선에 추가</ActionButton></form></section>
    {data.owner&&!["resolved","closed"].includes(data.report.status)&&<div className="ff-inline-actions"><ActionButton onClick={()=>close("resolved")}>찾았어요 · 해결됨</ActionButton><ActionButton variant="neutralWeak" onClick={()=>close("closed")}>신고 종료</ActionButton></div>}
  </div>;
}
