# 퍼스트프렌드 아키텍처 기준선

작성일: 2026-08-23  
기준 브랜치: `main`  
기준 커밋: `db28fb72ef62ebd4a84f030d970c4528357215c3`

이 문서는 퍼스트프렌드의 현재 구조와 다음 작업의 목표 구조를 고정한다. 구현 전에 이 문서와 변경 계획을 먼저 갱신한다.

## 현재 구조

### 실행과 배포

- Next App Router 호환 화면과 Route Handler를 `vinext`로 빌드한다.
- 운영 배포는 GitHub `origin/main` push 후 Vercel Production 자동 배포다.
- `vercel.json`에는 공공동물·실종동물·AI 작업 cron이 정의되어 있다.
- Vercel Cron 시간대는 UTC이며, cron 실패 시 자동 재시도가 보장되지 않는다.

### 데이터와 인증

- 실제 서버 데이터 접근은 `@supabase/supabase-js` 서버 클라이언트가 담당한다.
- 서버 클라이언트는 `SUPABASE_SECRET_KEY` 또는 기존 `SUPABASE_SERVICE_ROLE_KEY`를 사용한다.
- 애플리케이션 인증은 `auth_accounts`, `auth_sessions`와 `ff_session` 쿠키를 직접 관리한다.
- `members`는 사용자 프로필과 역할을 보관한다.
- Supabase RLS는 일부 공개 데이터와 작업 테이블에 적용되어 있다.
- D1·R2·Drizzle·Cloudflare 관련 설정과 문서가 남아 있어 실제 운영 구조와 역사적 구조가 혼재한다.

### 파일과 AI

- `lib/supabase/storage.ts`는 `uploads` 버킷을 사용한다.
- 공개 미디어와 인증 증빙이 같은 버킷 경로 체계에 의존한다.
- 보호동물 AI 소개는 Gemini 호출 결과를 Supabase에 저장한다.
- 상세 화면의 POST 요청이 AI 작업 생성과 처리를 직접 유발할 수 있다.

## 목표 구조

```text
Vercel Production
  ├─ 공개 화면: 보호동물·보호소·안내
  ├─ 인증 화면: Supabase Auth + PKCE cookie session
  ├─ Route Handler: 입력 검증·권한·rate limit·표준 오류
  └─ Vercel Cron: 짧은 작업을 idempotent하게 처리

Supabase
  ├─ Auth: 이메일 확인·비밀번호 재설정·OAuth·MFA
  ├─ Postgres: members와 서비스 도메인 데이터
  ├─ RLS: 브라우저 접근 데이터의 행 단위 권한
  ├─ public-media: 공개 동물·이야기 이미지
  └─ private-evidence: 인증·입양·이의제기 증빙

작업 흐름
  ├─ public data sync job
  ├─ animal AI summary job
  └─ 알림·외부 연동 대기 작업
```

## 설계 원칙

1. 인증·파일·권한은 직접 구현 범위를 줄이고 Supabase의 검증된 기능을 우선 사용한다.
2. 공개 자료와 개인정보 자료를 데이터베이스·Storage 버킷·URL 정책에서 분리한다.
3. 사용자 요청은 작업을 등록하고, 비용·시간이 큰 처리는 cron 작업이 수행한다.
4. 모든 외부 재시도 가능 작업은 중복 실행되어도 결과가 한 번만 반영되도록 만든다.
5. 서버 키를 사용하는 API는 RLS에만 의존하지 않고 애플리케이션 권한을 함께 검사한다.
6. 화면 문구와 상태는 SEED 컴포넌트·semantic token·Writing 규칙을 기준으로 유지한다.
7. 기능 추가보다 핵심 입양 흐름의 신뢰성·안전성·관찰 가능성을 우선한다.

## 도메인 경계

- Identity: 가입, 로그인, OAuth, 이메일 확인, 비밀번호, MFA, 탈퇴
- Member: 이름, 지역, 역할, 제재, 프로필
- Discovery: 보호동물, 보호소, 검색, 이미지, AI 소개
- Adoption: 준비도, 신청, 상담, 약정, 인계
- Safety: 실종·발견, 신고, 증빙, 이의제기, 운영 검토
- Community: 이야기, 질문답변, 가족 상의방
- Operations: 동기화, 알림, 외부 연동, 작업 상태

도메인 간 직접 테이블 쓰기를 줄이고, 중요한 상태 변경은 명시적인 서버 함수 또는 서비스 모듈을 거치게 한다.

## 완료 정의

- README와 환경변수 문서가 실제 Supabase·Vercel 구조와 일치한다.
- `private-evidence`가 공개 URL로 노출되지 않는다.
- 이메일 확인 전 계정 권한 정책이 명시되고 테스트된다.
- AI·동기화 작업이 사용자 요청 시간과 외부 API 비용에 종속되지 않는다.
- 인증·권한·업로드·cron 중복 실행 통합 테스트가 있다.
- `npm run lint`, `npm test`, `npm run build`가 통과한다.
- 운영 배포 전 체크리스트와 롤백 방법이 문서화되어 있다.

## 참고 자료

- Supabase Auth: https://supabase.com/docs/guides/auth
- Supabase SSR Auth: https://supabase.com/docs/guides/auth/server-side
- Supabase Storage: https://supabase.com/docs/guides/storage/buckets/fundamentals
- Vercel Cron: https://vercel.com/docs/cron-jobs/manage-cron-jobs
- OWASP Authentication: https://cheatsheetseries.owasp.org/cheatsheets/Authentication_Cheat_Sheet.html
- OWASP File Upload: https://cheatsheetseries.owasp.org/cheatsheets/File_Upload_Cheat_Sheet.html
