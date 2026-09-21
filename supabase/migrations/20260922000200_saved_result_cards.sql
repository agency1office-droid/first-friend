alter table public.member_quiz_completions
  add column medal smallint not null default 0 check (medal between 0 and 2),
  add column card jsonb;

update public.member_quiz_completions set medal = case
  when quiz = 'care-readiness' then case
    when title in ('함께할 준비가 잘 되어 있어요', '함께할 준비가 차곡차곡 갖춰졌어요') then 2
    when title in ('조금 더 확인해 보면 좋아요', '함께할 준비를 잘 이어가고 있어요') then 1 else 0 end
  when ratio >= 1 then 2 when ratio >= 0.8 then 1 else 0 end;

-- Compare and update in one database operation so simultaneous attempts cannot replace a better result.
create function public.save_best_quiz_card(p_member_id text, p_quiz text, p_ratio double precision,
  p_title text, p_medal smallint, p_card jsonb, p_completed_at timestamptz)
returns boolean language plpgsql set search_path = public as $$
begin
  insert into member_quiz_completions(member_id, quiz, ratio, title, medal, card, completed_at)
  values(p_member_id, p_quiz, p_ratio, p_title, p_medal, p_card, p_completed_at)
  on conflict(member_id, quiz) do update set
    ratio = excluded.ratio, title = excluded.title, medal = excluded.medal,
    card = excluded.card, completed_at = excluded.completed_at
  where (excluded.medal, excluded.ratio) > (member_quiz_completions.medal, member_quiz_completions.ratio);
  return found;
end;
$$;
revoke all on function public.save_best_quiz_card(text,text,double precision,text,smallint,jsonb,timestamptz) from public, anon, authenticated;
grant execute on function public.save_best_quiz_card(text,text,double precision,text,smallint,jsonb,timestamptz) to service_role;

create table public.member_worldcup_results (
  member_id text not null references public.members(id) on delete cascade,
  run_id uuid not null,
  animal_id text not null,
  card jsonb not null,
  completed_at timestamptz not null default now(),
  primary key(member_id, run_id)
);
create index member_worldcup_results_recent on public.member_worldcup_results(member_id, completed_at desc, run_id desc);
alter table public.member_worldcup_results enable row level security;
revoke all on public.member_worldcup_results from public, anon, authenticated;
grant select, insert, delete on public.member_worldcup_results to service_role;
