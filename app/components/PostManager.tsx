"use client";
import {useRef,useState} from "react";
import Link from "next/link";
import {ActionButton} from "seed-design/ui/action-button";
import {DialogRoot,DialogContent,DialogBody,DialogFooter} from "seed-design/ui/dialog";
import type {PublicStory} from "../../lib/stories";
export function PostManager({initial}:{initial:PublicStory[]}){
 const [items,setItems]=useState(initial),[selected,setSelected]=useState<PublicStory|null>(null),[pending,setPending]=useState(false),[error,setError]=useState("");const lock=useRef(false);
 async function remove(){if(!selected||lock.current)return;lock.current=true;setPending(true);setError("");try{const r=await fetch("/api/posts?id="+selected.postId+"&revision="+selected.revision,{method:"DELETE"});const result=await r.json();if(!r.ok)throw new Error(result.error);setItems(v=>v.filter(x=>x.postId!==selected.postId));setSelected(null);}catch(e){setError(e instanceof Error?e.message:"다시 시도해 주세요.");}finally{lock.current=false;setPending(false);}}
 return <><div className="ff-manage-list">{items.map(item=><article key={item.id}><div><span className="ff-kicker">{item.hidden?"운영 검토 중":item.status==="draft"?"임시저장":"게시됨"} · {item.category}</span><h2>{item.title||"제목 없는 이야기"}</h2><p>{item.body.slice(0,100)}</p></div><div className="ff-ops-actions"><Link href={"/stories/manage/"+item.postId}>수정</Link>{item.status==="published"&&!item.hidden&&<Link href={"/stories/"+item.id}>글 보기</Link>}<ActionButton size="small" variant="criticalSolid" onClick={()=>{setError("");setSelected(item);}}>삭제</ActionButton></div></article>)}{!items.length&&<p>작성한 이야기가 없어요.</p>}</div><DialogRoot open={Boolean(selected)} onOpenChange={(open)=>{if(!open&&!pending)setSelected(null);}}><DialogContent title="이 이야기를 삭제할까요?" description="삭제하면 목록에서 사라져요."><DialogBody>{selected?.title||"제목 없는 이야기"}{error&&<p role="alert">{error}</p>}</DialogBody><DialogFooter><ActionButton variant="neutralWeak" disabled={pending} onClick={()=>setSelected(null)}>취소</ActionButton><ActionButton variant="criticalSolid" disabled={pending} onClick={remove}>삭제하기</ActionButton></DialogFooter></DialogContent></DialogRoot></>;
}
