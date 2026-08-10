"use client";

import { useState } from "react";
import { ActionButton } from "seed-design/ui/action-button";
import { Callout } from "seed-design/ui/callout";
import { TextField, TextFieldInput } from "seed-design/ui/text-field";
import { useAppFeedback } from "./AppFeedback";

type Suggestion={id:number;name:string;reason:string;votes:number;selected:boolean};

export function ShelterNamePicker(){
  const[animalId,setAnimalId]=useState(""),[items,setItems]=useState<Suggestion[]>([]),[error,setError]=useState(""),feedback=useAppFeedback();
  async function load(e:React.FormEvent<HTMLFormElement>){e.preventDefault();const id=String(new FormData(e.currentTarget).get("animalId")||"").trim();const r=await fetch(`/api/community?type=names&id=${encodeURIComponent(id)}`),b=await r.json();setAnimalId(id);setItems(b.suggestions||[]);setError("")}
  async function select(suggestionId:number){const r=await fetch("/api/community",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({action:"name-select",suggestionId})}),b=await r.json();if(r.ok){feedback.success("보호소가 사용할 이름으로 채택했어요");setItems(rows=>rows.map(row=>({...row,selected:row.id===suggestionId})))}else setError(b.error)}
  return <section className="ff-result"><h2 className="ff-section-title">보호동물 이름 채택</h2><p className="ff-meta">회원이 제안하고 응원한 이름 가운데 보호소 담당자가 최종 이름을 선택합니다.</p><form className="ff-inline-form" onSubmit={load}><TextField label="보호동물 공고번호"><TextFieldInput name="animalId" required/></TextField><ActionButton>이름 후보 조회</ActionButton></form>{error&&<Callout tone="critical" description={error}/>}<div className="ff-chip-results">{items.map(item=><button key={item.id} type="button" disabled={item.selected} onClick={()=>select(item.id)}><strong>{item.selected?"✓ ":""}{item.name}</strong><span>응원 {item.votes} · {item.selected?"채택됨":"채택"}</span></button>)}</div>{animalId&&!items.length&&<Callout tone="informative" description="아직 제안된 이름이 없어요. 동물 상세 화면의 이름 제안 영역을 공유해 주세요."/>}</section>
}
