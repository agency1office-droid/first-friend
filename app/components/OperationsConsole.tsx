"use client";
import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { Badge } from "@seed-design/react";
import { IconEnvelopeLine } from "@karrotmarket/react-monochrome-icon";
import { siGoogle, siKakaotalk, siNaver } from "simple-icons";
import { ActionButton } from "seed-design/ui/action-button";
import { Callout } from "seed-design/ui/callout";
import { TextField, TextFieldInput, TextFieldTextarea } from "seed-design/ui/text-field";
import { SelectRoot, SelectTrigger, SelectContent, SelectItem } from "seed-design/ui/select";
import { DialogRoot, DialogContent, DialogBody, DialogFooter } from "seed-design/ui/dialog";
import { SideNavigationProvider, SideNavigationRoot, SideNavigationHeader, SideNavigationContent, SideNavigationGroup, SideNavigationFooter } from "seed-design/ui/side-navigation";
import { operationResources, operationGroups, operationLabels, parseOperationQuery, resourceAllowed, type OperationRow, type OperationResource } from "../../lib/operations";
import styles from "./OperationsConsole.module.css";
import { useAppFeedback } from "./AppFeedback";
import { OperationsManagement } from "./OperationsManagement";
import { OperationsOverview } from "./OperationsOverview";

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
  if (resource === "reports" && status === "open") return [
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
function MemberLoginMethods({ value }: { value: unknown }) {
  const names: Record<string, string> = { google: "구글", kakao: "카카오", naver: "네이버", email: "이메일" };
  const icons: Record<string, { path: string }> = { google: siGoogle, kakao: siKakaotalk, naver: siNaver };
  if (typeof value !== "string" || !value.trim()) return <p>연결 로그인: 연결 기록 없음</p>;
  return <div className={styles.loginMethods} aria-label="연결 로그인"><span>연결 로그인</span>{value.split(",").map((method,index) => {
    const provider = method.trim().split(" ")[0], icon = icons[provider];
    const label = method.trim().replace(provider, names[provider] || provider);
    return <Badge key={index} tone="neutral" variant="weak" className={styles.loginMethod}>
      {icon ? <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path fill="currentColor" d={icon.path}/></svg> : provider === "email" ? <IconEnvelopeLine aria-hidden="true" focusable="false"/> : null}
      <span>{label}</span>
    </Badge>;
  })}</div>;
}
function memberJoinedAt(value: unknown) {
  const date = new Date(String(value || ""));
  return Number.isNaN(date.getTime()) ? "날짜 기록 없음" : new Intl.DateTimeFormat("ko-KR", { timeZone: "Asia/Seoul", year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", hourCycle: "h23" }).format(date);
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
  const [menuOpen, setMenuOpen] = useState(false);
  const [menuSearch, setMenuSearch] = useState("");
  const detailRef = useRef<HTMLElement>(null);
  const lock = useRef(false);
  const requestKey = useRef("");
  let input;
  try { input = parseOperationQuery(new URLSearchParams(query)); }
  catch { input = parseOperationQuery(new URLSearchParams()); }
  const { resource, page, status, sort, queue, pageSize } = input;
  const config = operationResources[resource];
  const overview = new URLSearchParams(query).get("view") === "overview" && role === "admin";
  useEffect(() => {
    const sync = () => { setQuery(window.location.search.slice(1)); setSearch(new URLSearchParams(window.location.search).get("q") || ""); setLoading(true); setError(""); setResult(null); setSelected(null); setRefresh(value => value + 1); };
    window.addEventListener("popstate", sync);
    return () => window.removeEventListener("popstate", sync);
  }, []);
  useEffect(() => {
    const controller = new AbortController();
    if(new URLSearchParams(query).get("view")==="overview")return () => controller.abort();
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
    if (changes.resource) for (const key of ["q", "status", "queue", "field", "visibility", "role", "page", "sort"]) params.delete(key);
    Object.entries(changes).forEach(([key, value]) => value ? params.set(key, value) : params.delete(key));
    const next = params.toString();
    window.history.pushState(null, "", "/operations?" + next);
    resetList(); setQuery(next); setSearch(params.get("q") || ""); setNotice(""); setRefresh(value => value + 1);
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
  const groups = operationGroups.map(group => ({ ...group, keys: group.keys.filter(key => resources.includes(key) && (group.label + operationResources[key].label).includes(menuSearch.trim())) })).filter(group => group.keys.length);
  return <SideNavigationProvider collapsed={false}><div className={styles.layout}>
    <div className={styles.mobileBar}><strong>퍼스트프렌드 · 운영 콘솔</strong><ActionButton size="small" variant="neutralWeak" aria-expanded={menuOpen} aria-controls="operations-navigation" onClick={() => setMenuOpen(!menuOpen)}>{menuOpen ? "메뉴 닫기" : "업무 메뉴"}</ActionButton></div>
    <SideNavigationRoot id="operations-navigation" className={styles.sidebar} data-mobile-open={menuOpen} aria-label="확인할 업무">
      <SideNavigationHeader><Link className={styles.brand} href="/">퍼스트프렌드<span>운영 콘솔</span></Link><div className={styles.menuSearch}><TextField label="업무 메뉴 검색"><TextFieldInput value={menuSearch} onChange={event=>setMenuSearch(event.target.value)} placeholder="회원, 신고, 입양" /></TextField></div></SideNavigationHeader>
      <SideNavigationContent>{role==="admin"&&<SideNavigationGroup items={[{label:"운영 요약",current:overview,onClick:()=>{setMenuOpen(false);navigate({view:"overview"});}}]}/>}
      {groups.map(group => <SideNavigationGroup key={group.label + resource + String(overview) + menuSearch} items={[{label:group.label,defaultOpen:!!menuSearch || (!overview && group.keys.includes(resource)),items:group.keys.map(key=>({key,label:operationResources[key].label,current:!overview&&key===resource,onClick:()=>{setMenuOpen(false);setMenuSearch("");navigate({resource:key,view:""});}}))}]}/>)}
      {!groups.length&&<p className={styles.menuSearch} role="status">일치하는 메뉴가 없어요.</p>}</SideNavigationContent>
      <SideNavigationFooter><ActionButton asChild variant="neutralWeak" size="small"><a href="/mypage">나의 페이지로</a></ActionButton></SideNavigationFooter>
    </SideNavigationRoot>
    <section className={styles.console} aria-label="운영 업무">
    <header className={styles.topbar}><div><p>보호처·운영자 도구</p><h1>{overview?"운영 요약":config.label}</h1></div><Badge tone="neutral" variant="weak">{role === "admin" ? "관리자" : "보호소 운영자"}</Badge></header>
    {overview?<OperationsOverview onSelect={(key,pending)=>navigate({resource:key,view:"",queue:pending?"pending":""})}/>:<div className={styles.workspace}>
    {role==="admin"&&resource==="campaigns"&&<OperationsManagement resource={resource} row={null} onDone={reload}/>}
    <p>목록에서 항목을 선택하고, 내용을 검토한 뒤 처리해 주세요.</p>
    {resource==="publicAnimals"&&<Callout tone="informative" description="공공 원본의 동물 정보와 수집이 종료된 기록을 조회해요. 숨김은 우리 사이트에만 적용되며 다음 수집에도 유지돼요. 기존 공개 화면 캐시는 잠시 남을 수 있어요. 공고번호는 다음 수집부터 채워져요."/>}
    {notice && <Callout tone="positive" description={notice} />}
    {error && <Callout tone="critical" description={error} />}
    <div className={styles.reviewLayout} data-has-selection={!!selected}>
    <div className={styles.listPanel}>
    <div className={styles.quickViews} aria-label="빠른 목록 선택">
      <ActionButton size="small" variant={queue||status?"neutralWeak":"brandSolid"} onClick={()=>navigate({queue:"",status:"",page:"1"})}>전체 상태</ActionButton>
      {config.pending.length>0&&<ActionButton size="small" variant={queue?"brandSolid":"neutralWeak"} onClick={()=>navigate({queue:"pending",status:"",page:"1"})}>처리 대기</ActionButton>}
      <ActionButton size="small" variant="neutralWeak" onClick={()=>navigate({resource,view:""})}>검색 조건 초기화</ActionButton>
    </div>
    {queue&&<Callout tone="informative" description={"처리 대기: "+config.pending.map(display).join(" · ")+" 상태만 표시해요."}/>}
    <div className={styles.toolbar}><form className={styles.filters} onSubmit={event => { event.preventDefault(); navigate({ q: search.trim(), page: "1" }); }}>
      <TextField label={(operationLabels[config.search] || "내용") + " 검색"}><TextFieldInput value={search} maxLength={100} placeholder="검색어 또는 #번호" onChange={event => setSearch(event.target.value)} /></TextField>
      <ActionButton type="submit" variant="neutralWeak">검색</ActionButton>
    </form>
    <div className={styles.filters}>
      {resource==="members"&&<Filter label="검색 항목" value={new URLSearchParams(query).get("field")||"display_name"} options={["display_name","email","id"].map(value=>({value,label:operationLabels[value]}))} onChange={field=>navigate({field,page:"1"})}/>}
      {resource==="publicAnimals"&&<Filter label="검색 항목" value={new URLSearchParams(query).get("field")||"id"} options={["id","notice_no","name","shelter_name","region","breed"].map(value=>({value,label:operationLabels[value]}))} onChange={field=>navigate({field,page:"1"})}/>}
      {resource==="members"&&<Filter label="회원 역할" value={new URLSearchParams(query).get("role")||"all"} options={[{value:"all",label:"전체 역할"},...["admin","member","shelter","foster","veterinarian"].map(value=>({value,label:value==="admin"?"관리자":display(value)}))]} onChange={value=>navigate({role:value==="all"?"":value,page:"1"})}/>}
      {config.fields.split(",").includes("hidden")&&<Filter label="공개 여부" value={new URLSearchParams(query).get("visibility")||"all"} options={[{value:"all",label:"전체"},{value:"visible",label:"공개"},{value:"hidden",label:"숨김"}]} onChange={v=>navigate({visibility:v==="all"?"":v,page:"1"})}/>}
      {config.statuses.length > 0 && <Filter label="상태" value={queue ? "pending-queue" : status || "all"} options={[{ value: "all", label: "전체 상태" }, ...(config.pending.length?[{value:"pending-queue",label:"처리 대기 전체"}]:[]), ...config.statuses.map(value => ({ value, label: display(value) }))]} onChange={value => navigate({ queue:value==="pending-queue"?"pending":"", status: ["all","pending-queue"].includes(value) ? "" : value, page: "1" })} />}
      <Filter label="정렬" value={sort} options={[{ value: "oldest", label: "오래된 순" }, { value: "newest", label: "최근 순" }]} onChange={value => navigate({ sort: value, page: "1" })} />
    </div></div>
    <div className={styles.heading}><h2>{config.label}</h2><ActionButton size="small" variant="neutralWeak" disabled={loading} onClick={reload}>새로고침</ActionButton></div>
    <p role="status">{loading ? "목록을 불러오고 있어요." : result ? "전체 " + result.total.toLocaleString() + "건 · " + page + "페이지" : "다시 불러와 주세요."}</p>
    {!loading && result?.rows.length === 0 && <Callout tone="neutral" description="조건에 맞는 항목이 없어요. 검색어나 상태를 바꿔 확인해 주세요." />}
    <div className={styles.list}>{result?.rows.map(row => <article key={row.id} className={styles.card} data-selected={selected?.id === row.id}>
      <div className={styles.recordTitle}><h3>{display(row[config.title])}</h3>
        {resource==="publicAnimals"&&<><div>{typeof row.image_1==="string"&&/^https?:\/\//.test(row.image_1)&&<Image unoptimized src={row.image_1} alt={String(row.name)+" 사진"} width={80} height={80} style={{objectFit:"cover"}}/>}</div><p>{display(row.breed)} · {display(row.region)} · {display(row.shelter_name)}</p><p>공고번호: {row.notice_no?String(row.notice_no):"다음 수집 후 확인"}</p><p>{display(row.process_state)} · {row.active?"수집 중":"수집 종료"}</p></>}
        {resource==="members"&&<><p>이메일: {typeof row.email==="string"&&row.email.trim()?row.email:"등록된 이메일 없음"}</p><MemberLoginMethods value={row.login_methods}/></>}
        <p>#{row.id}</p></div>
      <div>{resource==="members" ? <Badge tone={row.role==="admin"?"informative":"neutral"} variant="weak">{row.role==="admin"?"관리자":display(row.role)}</Badge> : row.status != null && <Badge tone={(config.pending as readonly string[]).includes(String(row.status)) ? "warning" : "neutral"} variant="weak">{display(row.status)}</Badge>}</div>
      <p>{resource==="members"?<>가입일 (한국 시간)<br />{memberJoinedAt(row.created_at)}</>:resource==="publicAnimals"?<>원본 갱신일<br/>{display(row.updated)}<br/><Badge tone={row.hidden?"warning":"neutral"} variant="weak">{row.hidden?"사이트 숨김":"숨김 아님"}</Badge></>:display(row.created_at)}</p>
      <ActionButton size="small" variant="neutralWeak" aria-label={display(row[config.title]) + " 상세 검토"} onClick={() => { setSelected(row); setChoice(null); setActionError(""); requestAnimationFrame(() => detailRef.current?.focus()); }}>상세 검토</ActionButton>
    </article>)}</div>
    <nav className={styles.heading} aria-label="목록 페이지">
      <ActionButton variant="neutralWeak" disabled={loading || page <= 1} onClick={() => navigate({ page: String(page - 1) })}>이전</ActionButton>
      <ActionButton variant="neutralWeak" disabled={loading || !result || page * pageSize >= result.total} onClick={() => navigate({ page: String(page + 1) })}>다음</ActionButton>
    </nav>
    </div>
    {selected && <aside className={styles.detailPanel} ref={detailRef} tabIndex={-1} aria-label={config.label + " 상세 검토"}>
      <div className={styles.heading}><h2>상세 검토</h2><ActionButton size="small" variant="neutralWeak" onClick={() => setSelected(null)}>닫기</ActionButton></div>
      <h3>{display(selected[config.title])}</h3>
      {resource==="members"&&<div><Badge tone={selected.role==="admin"?"informative":"neutral"} variant="weak">{selected.role==="admin"?"관리자":display(selected.role)}</Badge></div>}
      <p>대상 번호 {selected.id}</p>
      {resource==="publicAnimals"&&<div className={styles.quickViews}>{[selected.image_1,selected.image_2].filter((src,index,all)=>typeof src==="string"&&/^https?:\/\//.test(src)&&all.indexOf(src)===index).map(src=><a key={String(src)} href={String(src)} target="_blank" rel="noreferrer"><Image unoptimized src={String(src)} alt="공공 원본 동물 사진" width={140} height={140} style={{objectFit:"cover"}}/></a>)}</div>}
      {["publicAnimals","registrations"].includes(resource)&&<ActionButton asChild size="small" variant="neutralWeak"><a href={"/friends/"+encodeURIComponent(resource==="registrations"?"direct-"+selected.id:String(selected.id))} target="_blank" rel="noreferrer">공개 페이지 확인</a></ActionButton>}
      <div className={styles.detail}><dl>{Object.entries(selected).filter(([key]) => operationLabels[key] && key !== "evidence_key").map(([key, value]) => <div key={key}><dt>{operationLabels[key]}</dt><dd>{display(value)}</dd></div>)}</dl>
      {typeof selected.evidence_key === "string" && <ActionButton asChild variant="neutralWeak"><a href={"/api/operations/evidence?key=" + encodeURIComponent(selected.evidence_key)} target="_blank" rel="noreferrer">증빙 확인</a></ActionButton>}</div>
      <div className={styles.actions}>{choices(resource, selected, role).map(item => <ActionButton key={item.label} variant={item.critical ? "criticalSolid" : "neutralWeak"} onClick={() => choose(item)}>{item.label}</ActionButton>)}</div>
      {role==="admin"&&<OperationsManagement resource={resource} row={selected} onDone={reload}/>}
    </aside>}
    </div></div>}
    <DialogRoot open={!!choice && !!selected} onOpenChange={open => { if (!open && !lock.current) setChoice(null); }}>
      <DialogContent title={choice ? choice.label + " 확인" : "처리 확인"} description={selected ? "대상 번호 " + selected.id : ""} showCloseButton={!pending}>
        <DialogBody><div className={styles.detail}>
          {choice && <><Callout tone={choice.critical ? "warning" : "informative"} description={choice.action === "guardian-message" ? "아래 메시지가 신청자에게 전달돼요." : (selected ? display(selected[config.title]) : "") + " 항목에 ‘" + choice.label + "’ 처리를 적용해요. 대상과 사유를 확인해 주세요."} />
            <TextField label={choice.action === "guardian-message" ? "상담 메시지" : "처리 사유"} required><TextFieldTextarea value={note} maxLength={500} disabled={pending} onChange={event => { setNote(event.target.value); requestKey.current = crypto.randomUUID(); }} /></TextField>
          </>}
          {actionError && <Callout tone="critical" description={actionError} />}
        </div></DialogBody>
        <DialogFooter><div className={styles.actions}>
          <ActionButton variant="neutralWeak" disabled={pending} onClick={() => setChoice(null)}>돌아가기</ActionButton>
          {choice && <ActionButton variant={choice.critical ? "criticalSolid" : "brandSolid"} disabled={pending || note.trim().length < 2} onClick={submit}>{pending ? "처리 중" : choice.label}</ActionButton>}
        </div></DialogFooter>
      </DialogContent>
    </DialogRoot>
  </section></div></SideNavigationProvider>;
}
