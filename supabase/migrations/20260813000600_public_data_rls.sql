-- 공개 데이터 테이블도 브라우저에서 직접 접근되더라도 비활성·동기화 내부 정보가 노출되지 않도록 제한합니다.
alter table public.public_animals enable row level security;
alter table public.public_lost_animals enable row level security;
alter table public.public_shelters enable row level security;
alter table public.public_sync_state enable row level security;

drop policy if exists "public active animals read" on public.public_animals;
create policy "public active animals read" on public.public_animals
  for select to anon, authenticated using (active = true);

drop policy if exists "public active lost animals read" on public.public_lost_animals;
create policy "public active lost animals read" on public.public_lost_animals
  for select to anon, authenticated using (active = true);

drop policy if exists "public shelters read" on public.public_shelters;
create policy "public shelters read" on public.public_shelters
  for select to anon, authenticated using (true);

drop policy if exists "public sync state read" on public.public_sync_state;
create policy "public sync state read" on public.public_sync_state
  for select to anon, authenticated using (id = 'public-animals');
