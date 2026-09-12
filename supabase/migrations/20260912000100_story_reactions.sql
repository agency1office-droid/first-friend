-- 이야기 반응을 응원 하나에서 다섯 가지 감정으로 넓힌다. reaction_count 총합은 정렬과 관리 화면에서 그대로 쓴다.
begin;
alter table public.posts add column if not exists reaction_counts jsonb not null default '{}'::jsonb;
update public.post_reactions set reaction='cheer' where reaction not in ('cheer','touched','cute','thanks','sad');
alter table public.post_reactions drop constraint if exists post_reactions_kind;
alter table public.post_reactions add constraint post_reactions_kind check (reaction in ('cheer','touched','cute','thanks','sad'));
update public.posts p set reaction_counts=coalesce((select jsonb_object_agg(r.reaction,r.n) from (select reaction,count(*) as n from public.post_reactions where post_id=p.id group by reaction) r),'{}'::jsonb);
drop function if exists public.set_story_reaction(text,bigint,boolean);
create or replace function public.set_story_reaction(p_member text,p_post bigint,p_reaction text)
returns jsonb language plpgsql security definer set search_path=public as $$
declare v_author text; v_previous text; v_counts jsonb; v_total integer;
begin
 if p_reaction is not null and p_reaction not in ('cheer','touched','cute','thanks','sad') then raise exception 'unknown reaction'; end if;
 select member_id into v_author from posts where id=p_post and status='published' and hidden=false for update;
 if not found then raise exception 'story unavailable'; end if;
 if not exists(select 1 from members where id=p_member and sanctioned=false) then raise exception 'member unavailable'; end if;
 select reaction into v_previous from post_reactions where member_id=p_member and post_id=p_post;
 if v_previous is distinct from p_reaction then
  if p_reaction is null then
   delete from post_reactions where member_id=p_member and post_id=p_post;
  else
   insert into post_reactions(member_id,post_id,reaction) values(p_member,p_post,p_reaction)
    on conflict(member_id,post_id) do update set reaction=excluded.reaction;
  end if;
  -- 글 행 잠금 아래에서 감정별 수와 총합을 증감한다. 다시 세지 않으므로 기존 총합이 그대로 이어진다.
  if v_previous is not null then
   update posts set reaction_counts=jsonb_set(reaction_counts,array[v_previous],to_jsonb(greatest(0,coalesce((reaction_counts->>v_previous)::integer,0)-1))),reaction_count=greatest(0,reaction_count-1) where id=p_post;
  end if;
  if p_reaction is not null then
   update posts set reaction_counts=jsonb_set(reaction_counts,array[p_reaction],to_jsonb(coalesce((reaction_counts->>p_reaction)::integer,0)+1)),reaction_count=reaction_count+1 where id=p_post;
  end if;
 end if;
 select reaction_counts,reaction_count into v_counts,v_total from posts where id=p_post;
 return jsonb_build_object('reaction',p_reaction,'previous',v_previous,'author',v_author,'counts',v_counts,'count',v_total);
end $$;
revoke all on function public.set_story_reaction(text,bigint,text) from public,anon,authenticated;
grant execute on function public.set_story_reaction(text,bigint,text) to service_role;
notify pgrst,'reload schema';
commit;
