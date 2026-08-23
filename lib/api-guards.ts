import { getSupabaseServerClient } from "./supabase/server";
import { logError } from "./observability";

type GuardResult =
  | { kind: "none" }
  | { kind: "started"; scope: string; subjectHash: string; key: string; requestHash: string }
  | { kind: "replay"; response: Response }
  | { kind: "conflict"; response: Response };

async function digest(value: string) {
  const bytes = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value));
  return Array.from(new Uint8Array(bytes), item => item.toString(16).padStart(2, "0")).join("");
}

export function requestSubject(request: Request, memberId?: string) {
  if (memberId) return `member:${memberId}`;
  const forwarded = request.headers.get("x-forwarded-for")?.split(",", 1)[0]?.trim();
  return `ip:${forwarded || request.headers.get("x-real-ip")?.trim() || "unknown"}`;
}

export async function enforceRateLimit(scope: string, subject: string, windowSeconds: number, maxRequests: number) {
  try {
    const subjectHash = await digest(subject);
    const { data, error } = await getSupabaseServerClient().rpc("consume_api_rate_limit", {
      p_scope: scope,
      p_subject_hash: subjectHash,
      p_window_seconds: windowSeconds,
      p_max_requests: maxRequests,
    });
    if (error) throw error;
    return Boolean(data);
  } catch (error) {
    logError("api.rate_limit_unavailable", error, { scope });
    return true;
  }
}

function idempotencyKey(request: Request) {
  const key = request.headers.get("idempotency-key")?.trim() || "";
  return /^[A-Za-z0-9._:-]{8,120}$/.test(key) ? key : "";
}

export async function beginIdempotentRequest(scope: string, subject: string, request: Request, requestInput: string): Promise<GuardResult> {
  const key = idempotencyKey(request);
  if (!key) return { kind: "none" };
  const subjectHash = await digest(subject);
  const requestHash = await digest(requestInput);
  const client = getSupabaseServerClient();
  const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
  const { data: inserted, error: insertError } = await client.from("api_idempotency_keys").insert({ scope, subject_hash: subjectHash, idempotency_key: key, request_hash: requestHash, status: "processing", expires_at: expiresAt }).select("request_hash,status,response_status,response_body").maybeSingle();
  if (inserted) return { kind: "started", scope, subjectHash, key, requestHash };
  if (insertError && insertError.code !== "23505") throw insertError;
  const { data: existing, error: readError } = await client.from("api_idempotency_keys").select("request_hash,status,response_status,response_body,expires_at").eq("scope", scope).eq("subject_hash", subjectHash).eq("idempotency_key", key).maybeSingle();
  if (readError) throw readError;
  if (!existing) return { kind: "none" };
  if (new Date(existing.expires_at).getTime() <= Date.now()) {
    await client.from("api_idempotency_keys").delete().eq("scope", scope).eq("subject_hash", subjectHash).eq("idempotency_key", key);
    return beginIdempotentRequest(scope, subject, request, requestInput);
  }
  if (existing.request_hash !== requestHash) return { kind: "conflict", response: Response.json({ error: "같은 Idempotency-Key에 다른 요청을 보낼 수 없어요." }, { status: 409 }) };
  if (existing.status === "completed" && existing.response_body) return { kind: "replay", response: Response.json(existing.response_body, { status: existing.response_status || 200, headers: { "cache-control": "no-store", "idempotency-replayed": "true" } }) };
  return { kind: "conflict", response: Response.json({ error: "같은 요청이 이미 처리 중이에요." }, { status: 409, headers: { "retry-after": "3" } }) };
}

export async function completeIdempotentRequest(guard: Extract<GuardResult, { kind: "started" }>, body: unknown, status: number) {
  await getSupabaseServerClient().from("api_idempotency_keys").update({ status: "completed", response_status: status, response_body: body, completed_at: new Date().toISOString() }).eq("scope", guard.scope).eq("subject_hash", guard.subjectHash).eq("idempotency_key", guard.key).eq("request_hash", guard.requestHash);
}

export async function releaseIdempotentRequest(guard: Extract<GuardResult, { kind: "started" }>) {
  await getSupabaseServerClient().from("api_idempotency_keys").delete().eq("scope", guard.scope).eq("subject_hash", guard.subjectHash).eq("idempotency_key", guard.key).eq("request_hash", guard.requestHash);
}
