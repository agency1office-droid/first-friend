create table public.sync_runs (
  id uuid primary key default gen_random_uuid(),
  kind text not null check (kind in ('public-animals','public-lost-animals','animal-thumbnails')),
  status text not null check (status in ('running','completed','partial','failed','paused')),
  started_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  finished_at timestamptz,
  processed_count bigint not null default 0,
  added_count bigint not null default 0,
  refreshed_count bigint not null default 0,
  deactivated_count bigint not null default 0,
  page_count integer not null default 0,
  image_completed bigint not null default 0,
  image_failed bigint not null default 0,
  original_bytes bigint not null default 0,
  thumbnail_bytes bigint not null default 0,
  message text not null default ''
);
create index sync_runs_started on public.sync_runs(started_at desc,id desc);
alter table public.sync_runs enable row level security;
revoke all on public.sync_runs from anon, authenticated;
grant all on public.sync_runs to service_role;
alter table public.public_sync_state add column current_run_id uuid references public.sync_runs(id);

-- Capture every invocation, including errors and checkpoint progress, without
-- reconstructing historical counts from today's database.
create function public.record_sync_state() returns trigger language plpgsql set search_path=public as $$
declare previous_id uuid; error_message text;
begin
  if pg_trigger_depth()>1 then return new; end if;
  if new.id not in ('public-animals','public-lost-animals') then return new; end if;
  if tg_op='UPDATE' then previous_id := old.current_run_id; end if;
  if new.status='running' and (previous_id is null or new.last_started_at is distinct from old.last_started_at) then
    update sync_runs set status='paused',finished_at=now(),updated_at=now()
      where id=previous_id and status='running';
    insert into sync_runs(kind,status,started_at) values(new.id,'running',coalesce(nullif(new.last_started_at,'')::timestamptz,now())) returning id into new.current_run_id;
    update public_sync_state set current_run_id=new.current_run_id where id=new.id;
  else
    new.current_run_id := previous_id;
  end if;
  error_message := case when new.status='failed' then coalesce(new.message,'') else '' end;
  if left(error_message,1)='{' then
    begin error_message := coalesce((error_message::jsonb)->>'error','동기화 실패'); exception when others then null; end;
  end if;
  update sync_runs set status=case new.status when 'complete' then 'completed' when 'failed' then 'failed' else 'running' end,
    processed_count=coalesce(new.item_count,0),page_count=coalesce(new.page_count,0),message=left(error_message,500),updated_at=now(),
    finished_at=case when new.status in ('complete','failed') then now() else null end
    where id=new.current_run_id;
  return new;
end $$;
create trigger record_sync_state after insert or update on public.public_sync_state for each row execute function public.record_sync_state();

-- Transition tables aggregate an entire upsert batch in one write, not once per
-- animal. Thumbnail/admin-only updates do not count as collection refreshes.
create function public.count_sync_insertions() returns trigger language plpgsql set search_path=public as $$
begin
  update sync_runs r set added_count=r.added_count+c.n,updated_at=now()
    from (select s.current_run_id,count(*) n from new_rows n join public_sync_state s
      on s.id=tg_argv[0] and s.status='running' and n.synced_at=s.last_started_at group by s.current_run_id) c
    where r.id=c.current_run_id;
  return null;
end $$;
create function public.count_sync_refreshes() returns trigger language plpgsql set search_path=public as $$
begin
  update sync_runs r set refreshed_count=r.refreshed_count+c.refreshed,deactivated_count=r.deactivated_count+c.deactivated,updated_at=now()
    from (select s.current_run_id,
      count(*) filter(where n.synced_at=s.last_started_at and n.synced_at is distinct from o.synced_at) refreshed,
      count(*) filter(where o.active and not n.active) deactivated
      from new_rows n join old_rows o using(id) join public_sync_state s on s.id=tg_argv[0] and s.status='running'
      group by s.current_run_id) c where r.id=c.current_run_id and (c.refreshed>0 or c.deactivated>0);
  return null;
end $$;
create trigger count_animal_inserts after insert on public.public_animals referencing new table as new_rows for each statement execute function public.count_sync_insertions('public-animals');
create trigger count_animal_refreshes after update on public.public_animals referencing old table as old_rows new table as new_rows for each statement execute function public.count_sync_refreshes('public-animals');
create trigger count_lost_inserts after insert on public.public_lost_animals referencing new table as new_rows for each statement execute function public.count_sync_insertions('public-lost-animals');
create trigger count_lost_refreshes after update on public.public_lost_animals referencing old table as old_rows new table as new_rows for each statement execute function public.count_sync_refreshes('public-lost-animals');

create function public.animal_image_job_summary() returns table(status text, count bigint, last_updated_at timestamptz)
language sql stable security invoker set search_path=public as $$
  select status,count(*),max(updated_at) from public.animal_image_jobs group by status;
$$;
revoke all on function public.animal_image_job_summary() from public,anon,authenticated;
grant execute on function public.animal_image_job_summary() to service_role;
revoke all on function public.record_sync_state(),public.count_sync_insertions(),public.count_sync_refreshes() from public,anon,authenticated;
