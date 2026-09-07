/* eslint-disable @next/next/no-img-element */
"use client";
import { useEffect, useRef, useState } from 'react';
import { ActionButton } from 'seed-design/ui/action-button';
import { TextField, TextFieldInput, TextFieldTextarea } from 'seed-design/ui/text-field';
import { Callout } from 'seed-design/ui/callout';
import { storyCategories, storyImageUrl } from '../../lib/story-input';
import type { PublicStory } from '../../lib/stories';
export function PostForm({initial}:{initial?:PublicStory}){
 const [title,setTitle]=useState(initial?.title||''),[body,setBody]=useState(initial?.body||''),[category,setCategory]=useState(initial?.categoryKey||'memory');
 const [photos,setPhotos]=useState<string[]>(initial?.imageKeys||[]),[record,setRecord]=useState(initial?{id:initial.postId,revision:initial.revision}:null);
 const [busy,setBusy]=useState(false),[dirty,setDirty]=useState(false),[error,setError]=useState(''),[lastSaved,setLastSaved]=useState('');
 const lock=useRef(false),leaving=useRef(false),clientKey=useRef('');
 useEffect(()=>{const warn=(e:BeforeUnloadEvent)=>{if(!leaving.current&&(dirty||busy)){e.preventDefault();e.returnValue='';}};window.addEventListener('beforeunload',warn);return()=>window.removeEventListener('beforeunload',warn);},[dirty,busy]);
 function expired(){location.href='/login?return_to='+encodeURIComponent(location.pathname);}
 async function upload(event:React.ChangeEvent<HTMLInputElement>){
  const files=Array.from(event.target.files||[]);event.target.value='';
  if(lock.current||!files.length)return;
  if(photos.length+files.length>3){setError('사진은 3장까지 올릴 수 있어요.');return;}
  if(files.some(f=>!['image/jpeg','image/png','image/webp'].includes(f.type)||f.size>4*1024*1024)){setError('4MB 이하 JPG·PNG·WEBP 사진을 선택해 주세요.');return;}
  lock.current=true;setBusy(true);setError('');
  try{for(const file of files){const form=new FormData();form.set('file',file);const r=await fetch('/api/post-media',{method:'POST',body:form});if(r.status===401){expired();return;}const result=await r.json();if(!r.ok)throw new Error(result.error);setPhotos(previous=>[...previous,result.key]);setDirty(true);}}
  catch(e){setError(e instanceof Error?e.message:'사진을 올리지 못했어요. 다시 시도해 주세요.');}
  finally{lock.current=false;setBusy(false);}
 }
 async function save(status:'draft'|'published'){
  if(lock.current)return;
  lock.current=true;setBusy(true);setError('');clientKey.current ||= crypto.randomUUID();
  try{
   const r=await fetch('/api/posts',{method:record?'PUT':'POST',headers:{'content-type':'application/json'},body:JSON.stringify({id:record?.id,revision:record?.revision,clientKey:clientKey.current,title,body,category,imageKeys:photos,status})});
   if(r.status===401){expired();return;}const result=await r.json();if(!r.ok)throw new Error(result.error);
   setRecord({id:result.post.id,revision:result.post.revision});setDirty(false);
   history.replaceState(null,'','/stories/manage/'+result.post.id);
   if(status==='published'){leaving.current=true;location.href='/stories/post-'+result.post.id;return;}
   setLastSaved(new Date().toLocaleTimeString('ko-KR',{hour:'2-digit',minute:'2-digit'}));
  }catch(e){setError(e instanceof Error?e.message:'저장하지 못했어요. 내용은 그대로 있으니 다시 시도해 주세요.');}
  finally{lock.current=false;setBusy(false);}
 }
 function move(index:number,direction:number){setPhotos(previous=>{const next=[...previous];[next[index],next[index+direction]]=[next[index+direction],next[index]];return next;});setDirty(true);}
 return <form className="ff-board-editor" onSubmit={e=>{e.preventDefault();void save('published');}}>
  <p className="ff-board-muted">남기고 싶은 순간만 가볍게 나눠요. 사진은 3장까지 올릴 수 있어요.</p>
  {initial?.hidden&&<Callout tone="warning" description="운영자가 확인 중인 글이에요. 검토 후 수정할 수 있어요."/>}
  <fieldset disabled={busy||initial?.hidden} className="ff-board-fields">
   <label className="ff-board-category-label">이야기 종류<select className="ff-native-select" value={category} onChange={e=>{setCategory(e.target.value);setDirty(true);}}>{Object.entries(storyCategories).map(([key,label])=><option key={key} value={key}>{label}</option>)}</select></label>
   <TextField label="제목" maxGraphemeCount={80} value={title} onValueChange={({slicedValue})=>{setTitle(slicedValue);setDirty(true);}}><TextFieldInput placeholder="어떤 이야기를 나누고 싶나요?"/></TextField>
   <TextField label="이야기" maxGraphemeCount={2000} value={body} onValueChange={({slicedValue})=>{setBody(slicedValue);setDirty(true);}}><TextFieldTextarea placeholder="함께한 일상이나 기억하고 싶은 순간을 적어 주세요." style={{minHeight:200}}/></TextField>
   <div className="ff-board-photo-head"><strong>사진 <span>{photos.length}/3</span></strong><label className="ff-board-upload">사진 추가<input aria-label="사진 추가" type="file" accept="image/jpeg,image/png,image/webp" multiple disabled={busy||photos.length>=3} onChange={upload}/></label></div>
   <div className="ff-board-photo-edit">{photos.map((key,i)=><div key={key}><img src={storyImageUrl(key,true)} alt={'첨부 사진 '+(i+1)}/><span>{i===0?'대표 사진':(i+1)+'번째 사진'}</span><div><ActionButton type="button" size="small" variant="neutralWeak" aria-label={(i+1)+'번째 사진 앞으로'} disabled={i===0} onClick={()=>move(i,-1)}>←</ActionButton><ActionButton type="button" size="small" variant="neutralWeak" aria-label={(i+1)+'번째 사진 뒤로'} disabled={i===photos.length-1} onClick={()=>move(i,1)}>→</ActionButton><ActionButton type="button" size="small" variant="neutralWeak" aria-label={(i+1)+'번째 사진 삭제'} onClick={()=>{setPhotos(v=>v.filter(x=>x!==key));setDirty(true);}}>삭제</ActionButton></div></div>)}</div>
   <p className="ff-board-muted">사진당 최대 4MB · 위치 정보는 제거하고 크기를 줄여 저장해요.</p>
  </fieldset>
  <Callout tone="neutral" description="게시한 글은 누구나 볼 수 있어요. 연락처·정확한 주소·동물의 위치는 빼 주세요. 임시저장한 글은 나만 볼 수 있어요."/>
  {error&&<div role="alert"><Callout tone="critical" description={error}/></div>}
  <div className="ff-board-save-status" role="status">{busy?'저장하고 있어요…':lastSaved?lastSaved+' 임시저장됨':dirty?'아직 저장하지 않은 내용이 있어요.':''}</div>
  <div className="ff-board-editor-actions"><ActionButton type="button" variant="neutralWeak" disabled={busy||initial?.hidden} onClick={()=>save('draft')}>임시저장</ActionButton><ActionButton type="submit" disabled={busy||initial?.hidden}>게시하기</ActionButton></div>
 </form>;
}
