-- public_animals stores ISO text, public_lost_animals stores timestamptz.
-- Compare instants explicitly so both statement triggers accept the same run.
create or replace function public.count_sync_insertions() returns trigger
language plpgsql set search_path=public as $$
begin
  update sync_runs r set added_count=r.added_count+c.n,updated_at=now()
    from (select s.current_run_id,count(*) n from new_rows n join public_sync_state s
      on s.id=tg_argv[0] and s.status='running'
      and n.synced_at::timestamptz=nullif(s.last_started_at,'')::timestamptz
      group by s.current_run_id) c
    where r.id=c.current_run_id;
  return null;
end $$;

create or replace function public.count_sync_refreshes() returns trigger
language plpgsql set search_path=public as $$
begin
  update sync_runs r set refreshed_count=r.refreshed_count+c.refreshed,
    deactivated_count=r.deactivated_count+c.deactivated,updated_at=now()
    from (select s.current_run_id,
      count(*) filter(where n.synced_at::timestamptz=nullif(s.last_started_at,'')::timestamptz
        and n.synced_at is distinct from o.synced_at) refreshed,
      count(*) filter(where o.active and not n.active) deactivated
      from new_rows n join old_rows o using(id) join public_sync_state s
        on s.id=tg_argv[0] and s.status='running'
      group by s.current_run_id) c
    where r.id=c.current_run_id and (c.refreshed>0 or c.deactivated>0);
  return null;
end $$;
