"use client";
import { useEffect, useRef, useState } from "react";
import { Badge } from "@seed-design/react";
import { ActionButton } from "seed-design/ui/action-button";
import { Callout } from "seed-design/ui/callout";
import { TextField, TextFieldInput, TextFieldTextarea } from "seed-design/ui/text-field";
import { SelectRoot, SelectTrigger, SelectContent, SelectItem } from "seed-design/ui/select";
import { DialogRoot, DialogContent, DialogBody, DialogFooter } from "seed-design/ui/dialog";
import { operationResources, operationLabels, parseOperationQuery, resourceAllowed, type OperationRow, type OperationResource } from "../../lib/operations";
import styles from "./OperationsConsole.module.css";
import { useAppFeedback } from "./AppFeedback";

type Choice = { label: string; action: string; status?: string; critical?: boolean; hidden?: boolean };
function choices(resource: OperationResource, row: OperationRow, role: string): Choice[] {
  const status = String(row.status || "");
  if (resource === "applications") {
    if (["rejected", "withdrawn", "completed"].includes(status)) return [];
    return [{ label: "상담 메시지 보내기", action: "guardian-message" },
      ...(["submitted", "review", "consulting"].includes(status) ? [
        ...(status !== "consulting" ? [{ label: "상담 시작", action: "application-status", status: "consulting" }] : []),
        { label: "승인", action: "application-status", status: "approved" },
        { label: "반려", action: "application-status", status: "rejected", critical: true },
      ] : []),
      ...(["approved", "handover"].includes(status) ? [{ label: "인계 확인", action: "guardian-confirm-handover" }] : [])];
  }
  if (resource === "returns") return status === "resolved" ? [] : [
    ...(status !== "connected" ? [{ label: "도움 연결", action: "return-status", status: "connected" }] : []),
    { label: "해결 기록", action: "return-status", status: "resolved" }];
  if (role !== "admin") return [];
  if (resource === "registrations") return status === "review" ? [{ label: "공개 승인", action: "registration-status", status: "published" }, { label: "반려", action: "registration-status", status: "closed", critical: true }] : status === "published" ? [{ label: "공개 종료", action: "registration-status", status: "closed", critical: true }] : [];
  const reviewActions = { verifications: "verification-status", certifications: "adoption-certification-status", appeals: "appeal-status", fundraisers: "fundraiser-status" };
  if (resource in reviewActions && ["submitted", "review"].includes(status)) return [
    { label: "승인", action: reviewActions[resource as keyof typeof reviewActions], status: resource === "appeals" ? "accepted" : resource === "fundraisers" ? "open" : "verified" },
    { label: "반려", action: reviewActions[resource as keyof typeof reviewActions], status: "rejected", critical: true }];
  if (resource === "reports") return [
    ...(row.target_type === "post" ? [{ label: "게시물 숨기기", action: "post-visibility", hidden: true, critical: true }, { label: "게시물 복구", action: "post-visibility", hidden: false }] : []),
    { label: "대상 계정 제재", action: "account-sanction-target", critical: true }];
  return [];
}
function display(value: unknown): string {
  if (typeof value === "boolean") return value ? "예" : "아니요";
  if (value == null || value === "") return "등록된 내용 없음";
  if (typeof value === "object") return JSON.stringify(value, null, 2);
  return operationLabels[String(value)] || String(value);
}
function Filter({ label, value, options, onChange }: { label: string; value: string; options: { value: string; label: string }[]; onChange: (value: string) => void }) {
  return <SelectRoot label={label} value={[value]} onValueChange={values => onChange(values[0] || "")}>
    <SelectTrigger /><SelectContent>{options.map(option => <SelectItem key={option.value} {...option} />)}</SelectContent>
  </SelectRoot>;
}

export function OperationsConsole({ role, initialQuery }: { role: string; initialQuery: string }) {
  const feedback = useAppFeedback();
  const [query, setQuery] = useState(initialQuery);
  const [result, setResult] = useState<{ rows: OperationRow[]; total: number } | null>(null);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [loading, setLoading] = useState(true);
  const [refresh, setRefresh] = useState(0);
  const [search, setSearch] = useState(new URLSearchParams(initialQuery).get("q") || "");
  const [selected, setSelected] = useState<OperationRow | null>(null);
  const [choice, setChoice] = useState<Choice | null>(null);
  const [note, setNote] = useState("");
  const [pending, setPending] = useState(false);
  const [actionError, setActionError] = useState("");
  const lock = useRef(false);
  const requestKey = useRef("");
  let input;
  try { input = parseOperationQuery(new URLSearchParams(query)); }
  catch { input = parseOperationQuery(new URLSearchParams()); }
  const { resource, page, status, sort, pageSize } = input;
  const config = operationResources[resource];
  useEffect(() => {
    const sync = () => { setQuery(window.location.search.slice(1)); setSearch(new URLSearchParams(window.location.search).get("q") || ""); setLoading(true); setError(""); setResult(null); setSelected(null); setRefresh(value => value + 1); };
    window.addEventListener("popstate", sync);
    return () => window.removeEventListener("popstate", sync);
  }, []);
  useEffect(() => {
    const controller = new AbortController();
    fetch("/api/operations?" + query, { signal: controller.signal, cache: "no-store" })
      .then(async response => { const body = await response.json(); if (!response.ok) throw new Error(body.error || "목록을 불러오지 못했어요."); return body; })
      .then(setResult)
      .catch(error => { if (!controller.signal.aborted) setError(error.message); })
      .finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, [query, refresh]);
  function resetList() { setLoading(true); setError(""); setResult(null); setSelected(null); }
  function reload() { resetList(); setRefresh(value => value + 1); }
  function navigate(changes: Record<string, string>) {
    const params = new URLSearchParams(query);
    Object.entries(changes).forEach(([key, value]) => value ? params.set(key, value) : params.delete(key));
    const next = params.toString();
    window.history.pushState(null, "", "/operations?" + next);
    resetList(); setQuery(next); setNotice(""); setRefresh(value => value + 1);
  }
  function choose(next: Choice) { setChoice(next); setNote(""); setActionError(""); requestKey.current = crypto.randomUUID(); }
  async function submit() {
    if (lock.current || !selected || !choice || note.trim().length < 2) return;
    lock.current = true; setPending(true); setActionError("");
    try {
      const response = await fetch("/api/operations", { method: "POST", headers: { "content-type": "application/json", "idempotency-key": requestKey.current }, body: JSON.stringify({
        action: choice.action, id: choice.action === "post-visibility" ? Number(selected.target_id) : selected.id,
        status: choice.status, hidden: choice.hidden, expectedStatus: selected.status,
        note: note.trim(), ...(choice.action === "guardian-message" ? { body: note.trim() } : {}),
      }) });
      const body = await response.json();
      if (!response.ok) throw new Error(body.error || "처리 결과를 확인하지 못했어요.");
      setNotice(choice.label + " 처리를 완료했어요."); feedback.success("운영 상태를 반영했어요."); setChoice(null); reload();
    } catch (error) { const message = error instanceof Error ? error.message : "연결을 확인하고 다시 시도해 주세요."; setActionError(message); feedback.error(message); }
    finally { lock.current = false; setPending(false); }
  }
  const resources = (Object.keys(operationResources) as OperationResource[]).filter(key => resourceAllowed(key, role));
  return <section className={styles.console} aria-label="운영 업무">
    <Filter label="확인할 업무" value={resource} options={resources.map(value => ({ value, label: operationResources[value].label }))} onChange={value => { setSearch(""); navigate({ resource: value, page: "1", q: "", status: "" }); }} />
    <form className={styles.filters} onSubmit={event => { event.preventDefault(); navigate({ q: search.trim(), page: "1" }); }}>
      <TextField label={(operationLabels[config.search] || "내용") + " 검색"}><TextFieldInput value={search} maxLength={100} placeholder="검색어 또는 #번호" onChange={event => setSearch(event.target.value)} /></TextField>
      <ActionButton type="submit" variant="neutralWeak">검색</ActionButton>
    </form>
    <div className={styles.filters}>
      {config.statuses.length > 0 && <Filter label="상태" value={status || "all"} options={[{ value: "all", label: "전체 상태" }, ...config.statuses.map(value => ({ value, label: display(value) }))]} onChange={value => navigate({ status: value === "all" ? "" : value, page: "1" })} />}
      <Filter label="정렬" value={sort} options={[{ value: "oldest", label: "오래된 순" }, { value: "newest", label: "최근 순" }]} onChange={value => navigate({ sort: value, page: "1" })} />
    </div>
    {notice && <Callout tone="positive" description={notice} />}
    {error && <Callout tone="critical" description={error} />}
    <div className={styles.heading}><h2>{config.label}</h2><ActionButton size="small" variant="neutralWeak" disabled={loading} onClick={reload}>새로고침</ActionButton></div>
    <p role="status">{loading ? "목록을 불러오고 있어요." : result ? "전체 " + result.total.toLocaleString() + "건 · " + page + "페이지" : "다시 불러와 주세요."}</p>
    {!loading && result?.rows.length === 0 && <Callout tone="neutral" description="조건에 맞는 항목이 없어요. 검색어나 상태를 바꿔 확인해 주세요." />}
    <div className={styles.list}>{result?.rows.map(row => <article key={row.id} className={styles.card}>
      <div className={styles.heading}><span>#{row.id}</span>{row.status != null && <Badge tone={(config.pending as readonly string[]).includes(String(row.status)) ? "warning" : "neutral"} variant="weak">{display(row.status)}</Badge>}</div>
      <h3>{display(row[config.title])}</h3><p>{display(row.created_at)}</p>
      <ActionButton size="small" variant="neutralWeak" onClick={() => { setSelected(row); setChoice(null); setActionError(""); }}>상세 검토</ActionButton>
    </article>)}</div>
    <nav className={styles.heading} aria-label="목록 페이지">
      <ActionButton variant="neutralWeak" disabled={loading || page <= 1} onClick={() => navigate({ page: String(page - 1) })}>이전</ActionButton>
      <ActionButton variant="neutralWeak" disabled={loading || !result || page * pageSize >= result.total} onClick={() => navigate({ page: String(page + 1) })}>다음</ActionButton>
    </nav>
    <DialogRoot open={!!selected} onOpenChange={open => { if (!open && !lock.current) { setSelected(null); setChoice(null); } }}>
      <DialogContent title={choice ? choice.label + " 확인" : config.label + " 상세 검토"} description={selected ? "대상 번호 " + selected.id : ""} showCloseButton={!pending}>
        <DialogBody><div className={styles.detail}>
          {!choice && selected && <>
            <dl>{Object.entries(selected).filter(([key]) => operationLabels[key] && key !== "evidence_key").map(([key, value]) => <div key={key}><dt>{operationLabels[key]}</dt><dd>{display(value)}</dd></div>)}</dl>
            {typeof selected.evidence_key === "string" && <ActionButton asChild variant="neutralWeak"><a href={"/api/operations/evidence?key=" + encodeURIComponent(selected.evidence_key)} target="_blank" rel="noreferrer">증빙 확인</a></ActionButton>}
          </>}
          {choice && <><Callout tone={choice.critical ? "warning" : "informative"} description={choice.action === "guardian-message" ? "아래 메시지가 신청자에게 전달돼요." : (selected ? display(selected[config.title]) : "") + " 항목에 ‘" + choice.label + "’ 처리를 적용해요. 대상과 사유를 확인해 주세요."} />
            <TextField label={choice.action === "guardian-message" ? "상담 메시지" : "처리 사유"} required><TextFieldTextarea value={note} maxLength={500} disabled={pending} onChange={event => { setNote(event.target.value); requestKey.current = crypto.randomUUID(); }} /></TextField>
          </>}
          {actionError && <Callout tone="critical" description={actionError} />}
        </div></DialogBody>
        <DialogFooter><div className={styles.actions}>
          <ActionButton variant="neutralWeak" disabled={pending} onClick={() => choice ? setChoice(null) : setSelected(null)}>{choice ? "돌아가기" : "닫기"}</ActionButton>
          {choice ? <ActionButton variant={choice.critical ? "criticalSolid" : "brandSolid"} disabled={pending || note.trim().length < 2} onClick={submit}>{pending ? "처리 중" : choice.label}</ActionButton> : selected && choices(resource, selected, role).map(item => <ActionButton key={item.label} variant={item.critical ? "criticalSolid" : "neutralWeak"} onClick={() => choose(item)}>{item.label}</ActionButton>)}
        </div></DialogFooter>
      </DialogContent>
    </DialogRoot>
  </section>;
}
