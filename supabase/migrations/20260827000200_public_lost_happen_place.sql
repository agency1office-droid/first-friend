alter table public.public_lost_animals
  add column if not exists happen_place text not null default '';
