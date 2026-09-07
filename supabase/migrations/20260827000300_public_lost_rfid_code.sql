alter table public.public_lost_animals
  add column if not exists rfid_cd text not null default '';
