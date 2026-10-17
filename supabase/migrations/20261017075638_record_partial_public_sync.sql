create or replace function public.record_sync_state() returns trigger language plpgsql set search_path=public as $$
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
  error_message := case when new.status in ('failed','partial') then coalesce(new.message,'') else '' end;
  if left(error_message,1)='{' then
    begin error_message := coalesce((error_message::jsonb)->>'error','동기화 실패'); exception when others then null; end;
  end if;
  update sync_runs set status=case new.status when 'complete' then 'completed' when 'failed' then 'failed' when 'partial' then 'partial' else 'running' end,
    processed_count=coalesce(new.item_count,0),page_count=coalesce(new.page_count,0),message=left(error_message,500),updated_at=now(),
    finished_at=case when new.status in ('complete','failed','partial') then now() else null end
    where id=new.current_run_id;
  return new;
end $$;
