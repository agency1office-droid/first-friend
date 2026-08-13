-- Vercel 함수 인스턴스가 여러 개여도 같은 동기화가 겹치지 않도록 하는 DB lease입니다.
create table if not exists public.sync_locks (
  lock_key text primary key,
  locked_until timestamptz not null
);

alter table public.sync_locks enable row level security;

create or replace function public.try_acquire_sync_lock(
  p_key text,
  p_lease_seconds integer default 300
)
returns boolean
language sql
security definer
set search_path = public
as $$
  with claimed as (
    insert into public.sync_locks(lock_key, locked_until)
    values (p_key, now() + make_interval(secs => greatest(p_lease_seconds, 30)))
    on conflict (lock_key) do update
      set locked_until = excluded.locked_until
      where public.sync_locks.locked_until <= now()
    returning lock_key
  )
  select exists(select 1 from claimed);
$$;

create or replace function public.release_sync_lock(p_key text)
returns boolean
language sql
security definer
set search_path = public
as $$
  delete from public.sync_locks where lock_key = p_key;
  select true;
$$;

revoke all on table public.sync_locks from public, anon, authenticated;
revoke all on function public.try_acquire_sync_lock(text, integer) from public;
revoke all on function public.release_sync_lock(text) from public;
grant execute on function public.try_acquire_sync_lock(text, integer) to service_role;
grant execute on function public.release_sync_lock(text) to service_role;
