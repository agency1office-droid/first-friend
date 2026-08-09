"use client";
import { useEffect, useState } from "react";
import { ActionButton } from "seed-design/ui/action-button";
import { Callout } from "seed-design/ui/callout";

type Notice = { id:number; title:string; body:string; href:string; read:boolean; createdAt:string };

export function NotificationCenter() {
  const [items, setItems] = useState<Notice[]>([]), [error, setError] = useState("");
  const load = () => fetch("/api/notifications").then(r => r.json()).then(body => body.error ? setError(body.error) : setItems(body.notifications)).catch(() => setError("알림을 불러오지 못했어요."));
  useEffect(load, []);
  const readAll = async () => { const response = await fetch("/api/notifications", { method:"POST" }); if (response.ok) setItems(current => current.map(item => ({...item, read:true}))); };
  if (error) return <Callout tone="critical" description={error}/>;
  return <section className="ff-section"><div className="ff-section-head"><h2 className="ff-section-title">최근 알림</h2>{items.some(x=>!x.read)&&<ActionButton size="small" variant="neutralWeak" onClick={readAll}>모두 읽음</ActionButton>}</div>{items.length?<div className="ff-ops-list">{items.map(item=><article key={item.id} style={{opacity:item.read?.7:1}}><a href={item.href||"/mypage"}><strong>{item.title}</strong><p className="ff-description" style={{margin:"5px 0"}}>{item.body}</p><span className="ff-meta">{new Date(item.createdAt).toLocaleString("ko-KR")}</span></a></article>)}</div>:<div className="ff-empty">아직 도착한 알림이 없어요.</div>}</section>;
}
