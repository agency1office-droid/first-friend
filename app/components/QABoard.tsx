"use client";

import { useCallback, useEffect, useState } from "react";
import { ActionButton } from "seed-design/ui/action-button";
import { TextField,TextFieldInput,TextFieldTextarea } from "seed-design/ui/text-field";
import { Callout } from "seed-design/ui/callout";
import { Badge } from "@seed-design/react";
import { useAppFeedback } from "./AppFeedback";

type Answer={id:number;body:string;author:string;expert:boolean;helpful:number};
type Question={id:number;category:string;title:string;body:string;status:string;answers:Answer[]};
const categoryLabels:Record<string,string>={adoption:"입양",health:"건강",behavior:"행동",care:"돌봄",shelter:"보호소 운영"};

export function QABoard(){
  const[rows,setRows]=useState<Question[]>([]),[loading,setLoading]=useState(true),[error,setError]=useState(""),feedback=useAppFeedback();
  const load=useCallback(()=>{fetch("/api/community?type=questions").then(response=>response.json()).then(body=>{setRows(body.questions||[]);setError(body.error||"")}).catch(()=>setError("질문을 불러오지 못했어요. 잠시 후 다시 시도해 주세요.")).finally(()=>setLoading(false))},[]);
  useEffect(()=>{load()},[load]);
  async function send(event:React.FormEvent<HTMLFormElement>,payload:Record<string,unknown>){event.preventDefault();const form=event.currentTarget,data=new FormData(form),response=await fetch("/api/community",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({...payload,...Object.fromEntries(data.entries())})}),body=await response.json();if(response.status===401){window.location.assign("/login?return_to=%2Fquestions");return}if(response.ok){form.reset();setError("");feedback.success(payload.action==="question-create"?"질문을 올렸어요":"답변을 남겼어요");load()}else{setError(body.error||"내용을 다시 확인해 주세요.");feedback.error(body.error||"등록하지 못했어요")}}
  return <><Callout tone="informative" title="경험과 진료를 구분해요" description="일반 답변은 생활 경험, 인증 수의사 답변은 면허 확인 배지로 표시합니다. 응급 증상은 게시판 답변을 기다리지 말고 동물병원에 연락하세요."/>{error&&<Callout tone="critical" description={error}/>}<form className="ff-play-card ff-form" onSubmit={event=>send(event,{action:"question-create"})}><div><div className="ff-kicker">상황을 구체적으로 적을수록 좋아요</div><h2>무엇이 궁금한가요?</h2></div><label className="ff-field"><span className="ff-legend">질문 분야</span><select className="ff-native-select" name="category" aria-label="질문 분야"><option value="adoption">입양</option><option value="health">건강</option><option value="behavior">행동</option><option value="care">돌봄</option><option value="shelter">보호소 운영</option></select></label><TextField label="질문 제목"><TextFieldInput name="title" minLength={5} required/></TextField><TextField label="상황과 이미 해본 행동" description="정확한 집 주소, 연락처 등 개인정보는 적지 마세요."><TextFieldTextarea name="body" minLength={20} required/></TextField><ActionButton>질문 올리기</ActionButton></form><section className="ff-section" aria-labelledby="qa-list-title"><div className="ff-section-head"><h2 className="ff-section-title" id="qa-list-title">함께 답을 찾는 질문</h2><span className="ff-meta">{rows.length}개</span></div>{loading?<div className="ff-empty" aria-live="polite">질문을 불러오는 중이에요.</div>:rows.length?<div className="ff-qa-list">{rows.map(question=><article key={question.id}><div className="ff-qa-meta"><span>{categoryLabels[question.category]||question.category}</span><span>{question.answers.length}개 답변</span></div><h2>{question.title}</h2><p>{question.body}</p>{question.answers.map(answer=><div className="ff-answer" key={answer.id}><div>{answer.expert?<Badge tone="positive" variant="weak">면허 확인 수의사</Badge>:<Badge tone="neutral" variant="weak">생활 경험</Badge>} <strong>{answer.author}</strong></div><p>{answer.body}</p></div>)}<form className="ff-inline-form" onSubmit={event=>send(event,{action:"answer-create",questionId:question.id})}><TextField label="내가 해본 해결 또는 전문 답변"><TextFieldInput name="body" minLength={20} required/></TextField><ActionButton size="small">답변</ActionButton></form></article>)}</div>:<div className="ff-empty">아직 질문이 없어요. 첫 질문을 남겨 함께 답을 찾아보세요.</div>}</section></>
}
