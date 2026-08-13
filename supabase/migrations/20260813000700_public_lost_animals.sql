create table if not exists public.public_lost_animals (
  id text primary key,
  legacy_id text not null default '',
  species text not null,
  breed text not null,
  sex text not null,
  age text not null,
  color text not null,
  happened_at text not null,
  region text not null,
  address text not null default '',
  place text not null default '',
  description text not null default '',
  image text not null default '',
  active boolean not null default true,
  last_seen_sync text not null default '',
  synced_at timestamptz not null default now()
);

create index if not exists idx_public_lost_animals_active_date
  on public.public_lost_animals (active, happened_at desc);
create index if not exists idx_public_lost_animals_region
  on public.public_lost_animals (active, region);
