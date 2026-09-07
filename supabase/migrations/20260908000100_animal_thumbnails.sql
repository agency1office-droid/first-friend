-- Keep original URLs. Reuse the existing private job queue and public bucket.
alter table public.animal_image_jobs drop constraint if exists animal_image_jobs_status_check;
alter table public.animal_image_jobs add constraint animal_image_jobs_status_check
check(status in ('pending','processing','completed','failed','superseded'));
create or replace function public.queue_animal_thumbnails() returns trigger
language plpgsql security definer set search_path = public as $$
declare n integer; source text;
begin
  for n in 1..2 loop
    source := case when n = 1 then new.image_1 else new.image_2 end;
    if tg_op = 'INSERT' or source is distinct from (case when n = 1 then old.image_1 else old.image_2 end) then
      if n = 1 then new.image_1_storage := null; else new.image_2_storage := null; end if;
      update animal_image_jobs set status='superseded',updated_at=now()
        where animal_id=new.id and slot=n and source_url is distinct from source;
      if coalesce(source, '') <> '' then
        insert into animal_image_jobs(animal_id,slot,source_url) values(new.id,n,source)
        on conflict(animal_id,slot,source_url) do update
          set status='pending',attempt_count=0,next_attempt_at=now(),updated_at=now(),last_error='';
      end if;
    end if;
  end loop;
  return new;
end $$;
drop trigger if exists queue_animal_thumbnails on public.public_animals;
create trigger queue_animal_thumbnails before insert or update of image_1,image_2
on public.public_animals for each row execute function public.queue_animal_thumbnails();

insert into public.animal_image_jobs(animal_id,slot,source_url)
select a.id,v.slot,v.source from public.public_animals a
cross join lateral (values(1,a.image_1),(2,a.image_2)) v(slot,source)
where coalesce(v.source,'') <> ''
on conflict(animal_id,slot,source_url) do update set
status='pending',attempt_count=0,next_attempt_at=now(),updated_at=now(),last_error=''
where coalesce(animal_image_jobs.storage_url,'') not like '%/thumb-v1/%';

update public.animal_image_jobs j set status='superseded',updated_at=now()
where not exists(select 1 from public.public_animals a where a.id=j.animal_id
  and j.source_url=case when j.slot=1 then a.image_1 else a.image_2 end);

-- Atomic claims prevent duplicate workers; expired leases recover interrupted runs.
create or replace function public.claim_animal_thumbnails(p_limit integer default 4)
returns setof public.animal_image_jobs language plpgsql security definer set search_path=public as $$
begin
  return query
  with candidates as (
    select j.id from animal_image_jobs j join public_animals a on a.id=j.animal_id
    where j.source_url = case when j.slot=1 then a.image_1 else a.image_2 end
    and ((j.status in ('pending','failed') and j.attempt_count<5 and j.next_attempt_at<=now())
      or (j.status='processing' and j.updated_at<now()-interval '10 minutes')
      or (j.status='completed' and j.updated_at<now()-interval '30 days'))
    order by a.active desc, j.created_at, j.id
    for update of j skip locked limit greatest(1,least(p_limit,20))
  ) update animal_image_jobs j set status='processing',
    attempt_count=case when j.status='completed' then 1 else j.attempt_count+1 end,
    updated_at=now() from candidates c where j.id=c.id returning j.*;
end $$;
revoke all on function public.queue_animal_thumbnails() from public,anon,authenticated;
revoke all on function public.claim_animal_thumbnails(integer) from public,anon,authenticated;
grant execute on function public.claim_animal_thumbnails(integer) to service_role;
