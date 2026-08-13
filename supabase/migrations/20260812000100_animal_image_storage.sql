-- 보호동물 이미지 전용 Supabase Storage 버킷
-- 버킷은 공개 읽기, 업로드·수정은 서버 service role만 수행합니다.

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'animal-images',
  'animal-images',
  true,
  10485760,
  array['image/jpeg', 'image/png', 'image/webp']
)
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

alter table public.public_animals
  add column if not exists image_1_storage text,
  add column if not exists image_2_storage text;

create index if not exists idx_public_animals_image_storage
  on public.public_animals (active, image_1_storage);

-- 공개 버킷이므로 이미지는 누구나 읽을 수 있습니다.
-- 업로드·삭제 정책은 만들지 않아 일반 클라이언트가 파일을 변경할 수 없게 합니다.
