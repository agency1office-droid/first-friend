"use client";
import { useEffect, useState } from "react";
import { ActionButton } from "seed-design/ui/action-button";
import { Callout } from "seed-design/ui/callout";

type Notice = { id:number; title:string; body:string; href:string; read:boolean; createdAt:string };

export function NotificationCenter() {
  const [items, setItems] = useState<Notice[]>([]), [error, setError] = useState(""), [pending,setPending] = useState(false);
  const load = () => fetch("/api/notifications").then(r => r.json()).then(body => body.error ? setError(body.error) : setItems(body.notifications)).catch(() => setError("알림을 불러오지 못했어요."));
  useEffect(() => { void load(); }, []);
  const readAll = async () => { if(pending)return;setPending(true);try { const response = await fetch("/api/notifications", { method:"POST" }); if (!response.ok) throw new Error(); setItems(current => current.map(item => ({...item, read:true}))); window.dispatchEvent(new Event("ff-notifications-change")); } catch {setError("알림을 읽음으로 바꾸지 못했어요. 새로고침 후 다시 시도해 주세요.");} finally {setPending(false);} };
  if (error) return <Callout tone="critical" description={error}/>;
  return <section className="ff-section"><div className="ff-section-head"><h2 className="ff-section-title">최근 알림</h2>{items.some(x=>!x.read)&&<ActionButton size="small" variant="neutralWeak" disabled={pending} onClick={readAll}>모두 읽음</ActionButton>}</div>{items.length?<div className="ff-ops-list">{items.map(item=><article key={item.id} style={{opacity:item.read?.7:1}}><a href={item.href||"/mypage"}><strong>{item.title}</strong><p className="ff-description" style={{margin:"5px 0"}}>{item.body}</p><span className="ff-meta">{new Date(item.createdAt).toLocaleString("ko-KR")}</span></a></article>)}</div>:<div className="ff-empty">아직 도착한 알림이 없어요.</div>}</section>;
}
