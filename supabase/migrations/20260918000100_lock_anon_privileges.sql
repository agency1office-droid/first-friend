-- 브라우저는 Supabase에 직접 접근하지 않습니다(모든 호출이 서버의 service_role을 거침). 2026-09-16 보안 감사에서
-- anon·authenticated에 남아 있던 공개 테이블 읽기와 검색 RPC 실행 권한(공개 키가 새면 서버 rate limit을 우회하는 DoS 표면),
-- 그리고 새 테이블·함수가 만들어지는 순간 anon에게 열리는 기본 권한(2026-09-07 이전 회원 테이블 노출의 원인)을 확인해 모두 거둡니다.
revoke all on all tables in schema public from public, anon, authenticated;
revoke all on all sequences in schema public from public, anon, authenticated;
revoke execute on all functions in schema public from public, anon, authenticated;

-- AI 소개 요약은 서버만 읽습니다. last_error(모델 오류 원문)까지 공개되던 정책을 지웁니다.
drop policy if exists "public animal ai summaries are readable" on public.public_animal_ai_summaries;

-- 앞으로 postgres 역할(마이그레이션)이 만드는 객체도 기본으로 잠깁니다. 필요한 권한은 마이그레이션에서 service_role에만 명시합니다.
-- Supabase가 anon·authenticated에 주는 기본 권한은 "in schema public" GRANT라 같은 형태로 되돌리고,
-- 함수의 PUBLIC 실행권은 PostgreSQL 전역 기본값이라 스키마 없는 형태로만 지워집니다(per-schema REVOKE는 per-schema GRANT만 되돌림).
alter default privileges for role postgres in schema public revoke all on tables from anon, authenticated;
alter default privileges for role postgres in schema public revoke all on sequences from anon, authenticated;
alter default privileges for role postgres in schema public revoke execute on functions from anon, authenticated;
alter default privileges for role postgres revoke execute on functions from public;
