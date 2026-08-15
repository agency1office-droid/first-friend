create table if not exists public.public_animal_ai_summaries (
  animal_id text primary key references public.public_animals(id) on delete cascade,
  analysis_key text not null,
  generated_summary text,
  status text not null default 'pending' check (status in ('pending', 'processing', 'completed', 'failed')),
  model_version text not null default '',
  source_updated_at text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  retry_count integer not null default 0,
  next_attempt_at timestamptz,
  last_error text
);

create index if not exists idx_public_animal_ai_summaries_status_updated
  on public.public_animal_ai_summaries(status, updated_at);

alter table public.public_animal_ai_summaries enable row level security;

drop policy if exists "public animal ai summaries are readable" on public.public_animal_ai_summaries;
create policy "public animal ai summaries are readable"
  on public.public_animal_ai_summaries for select
  using (true);
