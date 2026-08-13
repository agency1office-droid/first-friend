# Supabase 마이그레이션 자동화

`.github/workflows/supabase-migrate.yml`은 GitHub Actions에서 수동으로 실행할 수 있습니다.

1. GitHub 저장소의 **Settings → Secrets and variables → Actions**에서 `SUPABASE_DB_URL` 시크릿을 추가합니다.
2. 값은 Supabase **Connect → Session pooler**의 PostgreSQL 연결 문자열을 사용합니다. GitHub Actions는 IPv4 환경일 수 있어 무료 플랜의 Direct connection(IPv6)보다 Session pooler가 안전합니다.
3. GitHub **Actions → Supabase migrations → Run workflow**를 실행합니다.

이 값은 서비스 키가 아니라 데이터베이스 연결 문자열이므로 GitHub 시크릿에만 저장해야 합니다. 시크릿을 추가하기 전에는 워크플로가 안전하게 중단되며, Vercel 배포나 현재 서비스 동작에는 영향을 주지 않습니다.
