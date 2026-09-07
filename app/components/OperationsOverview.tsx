"use client";
import {useEffect,useState} from "react";
import {ActionButton} from "seed-design/ui/action-button";
import {Callout} from "seed-design/ui/callout";
import styles from "./OperationsConsole.module.css";
type Summary={counts:{resource:string;label:string;count:number|null;pending:boolean;error:string|null}[];jobs:{id:string;status:string;item_count:number;last_completed_at:string;message:string}[];emailReady:boolean;syncError:boolean;oauth:Record<string,boolean>};
export function OperationsOverview({onSelect}:{onSelect:(resource:string)=>void}){
  const [data,setData]=useState<Summary|null>(null),[error,setError]=useState(""),[version,setVersion]=useState(0);
  useEffect(()=>{const c=new AbortController();fetch('/api/operations?view=overview',{signal:c.signal}).then(async r=>{if(!r.ok)throw new Error('운영 상태를 불러오지 못했어요.');return r.json();}).then(setData).catch(e=>{if(!c.signal.aborted)setError(e.message);});return()=>c.abort();},[version]);
  return <div className={styles.workspace}><div className={styles.heading}><h2>오늘 확인할 일과 연결 상태</h2><ActionButton size="small" variant="neutralWeak" onClick={()=>{setError("");setData(null);setVersion(v=>v+1);}}>새로고침</ActionButton></div>
    {error&&<Callout tone="critical" description={error}/>}{!data&&!error&&<p role="status">운영 상태를 확인하고 있어요.</p>}
    {data&&<><Callout tone={data.emailReady?"positive":"warning"} description={data.emailReady?"이메일 발송 설정이 연결되어 있어요. 실제 도착 여부는 발송 제공자 기록을 확인해 주세요.":"이메일 발송 키·보낸 사람·회신 주소가 필요해요. 캠페인 작성과 앱 알림은 사용할 수 있어요."}/><p>로그인 설정: {Object.entries(data.oauth).map(([name,ready])=>`${name} ${ready?"등록됨":"미등록"}`).join(" · ")} · 실제 로그인 성공 여부와는 별도예요.</p>
      <div className={styles.summaryGrid}>{data.counts.map(item=><ActionButton variant="neutralWeak" className={styles.summaryCard} key={item.resource} onClick={()=>onSelect(item.resource)}><span>{item.label}</span><strong>{item.count===null?"확인 필요":item.count.toLocaleString()+"건"}</strong><span>{item.error||(item.pending?"처리 대기":"전체 기록")}</span></ActionButton>)}</div>
      <h2>공공데이터 동기화</h2>{data.syncError&&<Callout tone="warning" description="동기화 기록을 불러오지 못했어요."/>}{data.jobs.map(job=><div key={job.id} className={styles.listPanel}><h3>{job.id}</h3><p>{job.status} · {job.item_count}건 · 마지막 완료 {job.last_completed_at||"기록 없음"}</p><p>{job.message}</p></div>)}
      <Callout tone="neutral" description="후원 금액은 결제액이 아닌 참여 의향이에요. 공식 보호센터 전송·문자·푸시·결제·배차는 외부 계약 및 연동이 필요해요."/>
    </>}
  </div>;
}
