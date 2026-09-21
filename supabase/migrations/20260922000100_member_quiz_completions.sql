create table public.member_quiz_completions (
  member_id text not null references public.members(id) on delete cascade,
  quiz text not null check (quiz in ('care-readiness', 'adoption-prep', 'pet-knowledge')),
  ratio double precision not null check (ratio >= 0 and ratio <= 1),
  title text not null check (char_length(title) between 1 and 80),
  completed_at timestamptz not null default now(),
  primary key (member_id, quiz)
);
alter table public.member_quiz_completions enable row level security;
revoke all on public.member_quiz_completions from public, anon, authenticated;
grant select, insert, update, delete on public.member_quiz_completions to service_role;
