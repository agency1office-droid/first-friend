-- Vercel 다중 인스턴스에서도 동작하는 rate limit·idempotency 저장소입니다.

create table if not exists public.api_rate_limit_events (
  id bigint generated always as identity primary key,
  scope text not null,
  subject_hash text not null,
  created_at timestamptz not null default now()
);

create index if not exists idx_api_rate_limit_events_lookup
  on public.api_rate_limit_events (scope, subject_hash, created_at desc);

create table if not exists public.api_idempotency_keys (
  id bigint generated always as identity primary key,
  scope text not null,
  subject_hash text not null,
  idempotency_key text not null,
  request_hash text not null,
  status text not null check (status in ('processing', 'completed')),
  response_status integer,
  response_body jsonb,
  created_at timestamptz not null default now(),
  completed_at timestamptz,
  expires_at timestamptz not null,
  unique (scope, subject_hash, idempotency_key)
);

create index if not exists idx_api_idempotency_expiry
  on public.api_idempotency_keys (expires_at);

create or replace function public.consume_api_rate_limit(
  p_scope text,
  p_subject_hash text,
  p_window_seconds integer,
  p_max_requests integer
) returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  current_count integer;
begin
  perform pg_advisory_xact_lock(hashtextextended(p_scope || ':' || p_subject_hash, 0));
  delete from public.api_rate_limit_events
    where created_at < now() - make_interval(secs => greatest(p_window_seconds, 1) * 2);
  select count(*) into current_count
    from public.api_rate_limit_events
    where scope = p_scope
      and subject_hash = p_subject_hash
      and created_at >= now() - make_interval(secs => greatest(p_window_seconds, 1));
  if current_count >= greatest(p_max_requests, 1) then
    return false;
  end if;
  insert into public.api_rate_limit_events (scope, subject_hash) values (p_scope, p_subject_hash);
  return true;
end;
$$;

revoke all on function public.consume_api_rate_limit(text, text, integer, integer) from public, anon, authenticated;
grant execute on function public.consume_api_rate_limit(text, text, integer, integer) to service_role;

-- 서버 service role만 접근하며, anon/authenticated에는 테이블 권한을 부여하지 않습니다.
