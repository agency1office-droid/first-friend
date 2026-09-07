"use client";
import { useEffect, useState } from "react";
import { Badge } from "@seed-design/react";
import { ActionButton } from "seed-design/ui/action-button";
import { Callout } from "seed-design/ui/callout";
import { SelectRoot, SelectTrigger, SelectContent, SelectItem } from "seed-design/ui/select";
import styles from "./OperationsConsole.module.css";

const kinds: Record<string,string> = { "public-animals": "보호동물 동기화", "public-lost-animals": "실종동물 동기화", "animal-thumbnails": "이미지 변환" };
const statuses: Record<string,string> = { running: "진행 중", completed: "완료", complete: "완료", partial: "일부 실패", failed: "실패", paused: "이어서 처리" };
type Run = { id:string; kind:string; status:string; started_at:string; updated_at:string; finished_at:string|null; processed_count:number; added_count:number; refreshed_count:number; deactivated_count:number; page_count:number; image_completed:number; image_failed:number; original_bytes:number; thumbnail_bytes:number; message:string };
type Data = { runs:Run[]; total:number; states:{id:string;status:string;last_started_at:string;last_completed_at:string|null;item_count:number}[]; images:{status:string;count:number;last_updated_at:string}[]; lastImageRun:string|null };
function date(value: string|null) { return value ? new Date(value).toLocaleString("ko-KR", {timeZone:"Asia/Seoul",hour12:false}) : "기록 없음"; }
function size(bytes:number) { return `${(bytes/1024/1024).toFixed(2)} MB`; }
function Select({label,value,values,onChange}:{label:string;value:string;values:Record<string,string>;onChange:(value:string)=>void}) {
  return <SelectRoot label={label} value={[value||"all"]} onValueChange={v=>onChange(v[0]==="all"?"":v[0]||"")}><SelectTrigger/><SelectContent><SelectItem value="all" label="전체"/>{Object.entries(values).map(([value,label])=><SelectItem key={value} value={value} label={label}/>)}</SelectContent></SelectRoot>;
}
export function OperationsSyncHistory({ query, navigate }: {query:string;navigate:(values:Record<string,string>)=>void}) {
  const params=new URLSearchParams(query),kind=params.get("kind")||"",status=params.get("status")||"",page=Math.max(1,Number(params.get("page"))||1);
  const [data,setData]=useState<Data|null>(null),[error,setError]=useState(""),[loading,setLoading]=useState(true),[version,setVersion]=useState(0);
  useEffect(()=>{const c=new AbortController();
    fetch(`/api/operations?view=sync&kind=${encodeURIComponent(kind)}&status=${encodeURIComponent(status)}&page=${page}`,{signal:c.signal,cache:"no-store"})
      .then(async r=>{const body=await r.json();if(!r.ok)throw new Error(body.error||"기록을 불러오지 못했어요.");return body;})
      .then(body=>{if(!c.signal.aborted)setData(body);}).catch(e=>{if(!c.signal.aborted)setError(e.message);}).finally(()=>{if(!c.signal.aborted)setLoading(false);});
    return()=>c.abort();},[kind,status,page,version]);
  return <div className={styles.workspace}>
    <div className={styles.heading}><p>실행 시각은 한국 시간이에요. 새로고침하면 최신 기록을 확인할 수 있어요.</p><ActionButton variant="neutralWeak" size="small" disabled={loading} onClick={()=>{setLoading(true);setError("");setData(null);setVersion(v=>v+1);}}>새로고침</ActionButton></div>
    {error&&<Callout tone="critical" description={error}/>}
    <div className={styles.summaryGrid}>{data?.states.map(s=><section className={styles.listPanel} key={s.id}><h2>{kinds[s.id]}</h2><p>현재 상태: {statuses[s.status]||s.status}</p><p>마지막 시작: {date(s.last_started_at)}</p><p>마지막 성공: {date(s.last_completed_at)}</p><p>최근 수집: {s.item_count.toLocaleString()}건</p></section>)}
    {data&&<section className={styles.listPanel}><h2>이미지 처리 현황</h2><p>마지막 실행 완료: {date(data.lastImageRun)}</p>{data.images.map(s=><p key={s.status}>{({pending:"대기",processing:"처리 중",completed:"변환 완료",failed:"실패·재시도 대상",superseded:"원본 변경으로 종료"} as Record<string,string>)[s.status]||s.status}: {Number(s.count).toLocaleString()}건</p>)}<ActionButton variant="neutralWeak" size="small" onClick={()=>navigate({resource:"imageJobs",view:"",kind:"",status:"failed",page:"1"})}>이미지 실패 상세 보기</ActionButton></section>}</div>
    <Callout tone="informative" title="기록을 읽는 방법" description="신규는 처음 등록한 동물, 재수집은 기존 동물을 다시 확인한 건수예요. 재수집이 모두 내용 변경을 뜻하지는 않아요. 실종동물 처리·페이지 수는 이어받은 누적 값이에요. 실행별 이력은 이 기능을 적용한 이후부터 남으며, 이전 마지막 성공 시각은 기존 기록을 표시해요."/>
    <div className={styles.filters}><Select label="작업 종류" value={kind} values={kinds} onChange={kind=>navigate({kind,page:"1"})}/><Select label="실행 상태" value={status} values={{running:"진행 중",completed:"완료",partial:"일부 실패",failed:"실패",paused:"이어서 처리"}} onChange={status=>navigate({status,page:"1"})}/></div>
    <p role="status">{loading?"동기화 기록을 불러오고 있어요.":data?`전체 ${data.total.toLocaleString()}회 · ${page}페이지`:"기록을 다시 불러와 주세요."}</p>
    {data?.runs.length===0&&<Callout tone="neutral" description="조건에 맞는 실행 기록이 없어요. 다음 동기화부터 실행 이력이 쌓여요."/>}
    {data?.runs.map(run=><article key={run.id} className={styles.listPanel}>
      <div className={styles.heading}><h2>{kinds[run.kind]}</h2><Badge variant="weak" tone={["failed","partial"].includes(run.status)?"warning":"neutral"}>{statuses[run.status]||run.status}</Badge></div>
      <p>시작 {date(run.started_at)} · 종료 {date(run.finished_at)}</p>
      <p>최근 기록 {date(run.updated_at)}{run.finished_at?` · 소요 ${Math.max(0,Math.round((Date.parse(run.finished_at)-Date.parse(run.started_at))/1000)).toLocaleString()}초`:""}</p>
      {run.status==="running"&&Date.now()-Date.parse(run.updated_at)>15*60000&&<Callout tone="warning" description="15분 이상 새 기록이 없어요. 중단됐는지 실행 로그를 확인해 주세요. 완료로 처리하지 않았어요."/>}
      {run.kind==="animal-thumbnails"?<><p>성공 {run.image_completed.toLocaleString()}건 · 실패 {run.image_failed.toLocaleString()}건</p><p>성공한 이미지 용량: 원본 {size(run.original_bytes)} → 썸네일 {size(run.thumbnail_bytes)}{run.original_bytes>0?` · ${(100*(1-run.thumbnail_bytes/run.original_bytes)).toFixed(1)}% 감소`:""}</p><p>WebP · 최대 480 × 480 · 비율 유지 · 작은 원본 확대 없음 · 품질 78 · 원본 보존</p></>:<p>신규 {run.added_count.toLocaleString()}건 · 재수집 {run.refreshed_count.toLocaleString()}건 · 수집 종료 {run.deactivated_count.toLocaleString()}건 · 처리 {run.processed_count.toLocaleString()}건 · {run.page_count.toLocaleString()}페이지</p>}
      {run.message&&<Callout tone="warning" title="확인할 문제" description={run.message}/>}
      <p>실행 번호: {run.id}</p>
    </article>)}
    <div className={styles.actions}><ActionButton variant="neutralWeak" disabled={loading||page<=1} onClick={()=>navigate({page:String(page-1)})}>이전</ActionButton><ActionButton variant="neutralWeak" disabled={loading||!data||page*20>=data.total} onClick={()=>navigate({page:String(page+1)})}>다음</ActionButton></div>
  </div>;
}
