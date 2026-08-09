"use client";
import { useEffect, useState } from "react";
import { ActionButton } from "seed-design/ui/action-button";
import { Badge } from "@seed-design/react";
import { Callout } from "seed-design/ui/callout";
import { Switch } from "seed-design/ui/switch";
import { useAppFeedback } from "./AppFeedback";

type Search = { id: number; name: string; criteriaJson: string; alertsEnabled: boolean; createdAt: string };
export function SavedSearchManager() {
  const [items, setItems] = useState<Search[]>([]), [error, setError] = useState("");
  const feedback = useAppFeedback();
  useEffect(() => { let active = true; void fetch("/api/saved-searches").then(async response => ({ response, body: await response.json() })).then(({ response, body }) => { if (!active) return; if (response.status === 401) { location.href = "/login?return_to=%2Fmypage%2Fsearches"; return; } if (response.ok) setItems(body.searches); else setError(body.error); }); return () => { active = false; }; }, []);
  async function toggle(item: Search, value: boolean) { const response = await fetch("/api/saved-searches", { method: "PATCH", headers: { "content-type": "application/json" }, body: JSON.stringify({ id: item.id, alertsEnabled: value }) }); if (response.ok) { setItems(current => current.map(row => row.id === item.id ? { ...row, alertsEnabled: value } : row)); feedback.success(value ? "새 친구 알림을 켰어요" : "새 친구 알림을 껐어요"); } else feedback.error("알림 설정을 바꾸지 못했어요"); }
  async function remove(id: number) { if (!confirm("이 알림 조건을 삭제할까요?")) return; const response = await fetch(`/api/saved-searches?id=${id}`, { method: "DELETE" }); if (response.ok) { setItems(current => current.filter(row => row.id !== id)); feedback.success("검색 알림을 삭제했어요"); } else feedback.error("검색 알림을 삭제하지 못했어요"); }
  if (error) return <Callout tone="critical" description={error} />;
  return <div className="ff-manage-list">{items.map(item => { let detail = ""; try { const criteria = JSON.parse(item.criteriaJson); detail = [criteria.species, criteria.breed, criteria.coat, criteria.age, criteria.gender, criteria.region].filter((value: string) => value && value !== "전체" && value !== "상관 없음" && value !== "전국").join(" · "); } catch { /* 저장된 이름은 계속 표시 */ } return <article key={item.id}><div className="ff-grow"><Badge tone={item.alertsEnabled ? "positive" : "neutral"} variant="weak">{item.alertsEnabled ? "알림 켜짐" : "알림 꺼짐"}</Badge><h2>{item.name}</h2><p>{detail || "저장된 시각 특징과 검색 조건"}</p></div><div className="ff-ops-actions"><Switch aria-label={`${item.name} 알림`} checked={item.alertsEnabled} onCheckedChange={value => toggle(item, value)} /><ActionButton size="small" variant="criticalSolid" onClick={() => remove(item.id)}>삭제</ActionButton></div></article>; })}{!items.length && <div className="ff-empty">저장한 조건이 없어요. 그림·사진·조건 찾기 결과에서 알림을 저장할 수 있어요.</div>}</div>;
}
