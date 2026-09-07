alter table public.public_animal_ai_summaries
  add column if not exists purpose text not null default 'adoption';

alter table public.public_animal_ai_summaries
  drop constraint if exists public_animal_ai_summaries_animal_id_fkey;

alter table public.public_animal_ai_summaries
  drop constraint if exists public_animal_ai_summaries_pkey;

alter table public.public_animal_ai_summaries
  add constraint public_animal_ai_summaries_purpose_check
  check (purpose in ('adoption', 'lost'));

alter table public.public_animal_ai_summaries
  add primary key (animal_id, purpose);

create index if not exists idx_public_animal_ai_summaries_scope_status
  on public.public_animal_ai_summaries(animal_id, purpose, status);
