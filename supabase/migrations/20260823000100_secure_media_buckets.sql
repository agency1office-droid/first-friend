-- 공개 미디어와 운영 검토용 증빙을 서로 다른 Storage 버킷으로 분리합니다.
-- 서버 service role만 업로드하므로 일반 클라이언트용 쓰기 정책은 만들지 않습니다.

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'public-media',
  'public-media',
  true,
  31457280,
  array['image/jpeg', 'image/png', 'image/webp', 'video/mp4', 'video/webm']
)
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'private-evidence',
  'private-evidence',
  false,
  8388608,
  array['image/jpeg', 'image/png', 'image/webp']
)
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

-- 기존 uploads 버킷과 파일은 운영 데이터 확인 전까지 보존합니다.
