# 인증·파일·AI 단계별 이전 계획

작성일: 2026-08-23  
상태: 설계 승인 전

이 문서는 기존 사용자와 기존 기능을 보존하면서 운영 안정성 기반을 바꾸기 위한 순서를 정의한다. 각 단계는 이전 단계의 테스트와 롤백 방법이 준비된 뒤 시작한다.

## 0단계. 기준선과 운영 데이터 확인

### 작업

- Supabase 프로젝트에서 실제 테이블·버킷·RLS·Auth Provider 설정을 읽기 전용으로 확인한다.
- `members`, `auth_accounts`, `auth_sessions`의 행 수와 관계를 익명화된 통계로 기록한다.
- 현재 운영 환경의 OAuth redirect URL, 이메일 발송 설정, cron secret, Storage bucket 상태를 확인한다.
- 테스트 계정·운영 계정·운영자 계정을 분리한다.
- GitHub Actions의 Supabase migration workflow가 실제 운영 DB에 연결되는지 확인한다.

### 금지

- 사용자 계정 삭제·변경
- 운영 버킷 공개 설정 변경
- 운영 DB에 테스트 데이터 삽입

### 완료 기준

- 마이그레이션 전 백업 또는 복구 가능한 export 확인
- 실제 운영 환경변수의 이름과 사용처 목록화
- 기존 로그인·OAuth·로그아웃의 성공 기준 작성

## 1단계. Storage 안전 분리

### 목표

공개 미디어와 개인정보 증빙을 물리적으로 분리한다.

### 설계

```text
public-media/
  {memberId}/{uuid}.jpg

private-evidence/
  {memberId}/{purpose}/{uuid}.jpg
```

- `public-media`: 공개 URL 허용, 이미지·영상 제한
- `private-evidence`: private bucket, signed URL 또는 관리자 서버 스트리밍만 허용
- 파일 확장자는 서버가 MIME·signature 확인 후 생성한다.
- 업로드 후 DB에 object key와 purpose를 기록한다.
- DB insert 실패 시 업로드 파일을 삭제하는 보상 작업을 수행한다.

### 테스트

- 다른 사용자가 증빙을 읽을 수 없는지 확인
- 운영자만 승인된 증빙을 읽을 수 있는지 확인
- `image/jpeg`로 위장한 파일이 거절되는지 확인
- 공개 미디어가 private URL을 반환하지 않는지 확인

## 2단계. Supabase Auth 이전

### 목표

직접 구현한 비밀번호·세션 lifecycle을 Supabase Auth의 검증된 흐름으로 이전한다.

### 권장 흐름

1. Supabase Auth에 이메일·OAuth Provider를 설정한다.
2. `members.auth_user_id`를 추가한다.
3. 신규 가입은 Supabase Auth에 먼저 생성한다.
4. 이메일 확인 callback에서 `members` 프로필을 만든다.
5. 서버와 브라우저는 PKCE·cookie session을 사용한다.
6. 보호된 화면은 Auth user와 `members` 역할을 함께 확인한다.
7. 기존 `auth_accounts` 사용자는 단계적으로 연결한다.
8. 기존 세션은 유예 기간 후 만료시킨다.
9. 모든 사용자가 이전된 뒤 custom auth 테이블을 보관 또는 제거한다.

### 이전 안전장치

- `auth_user_id`는 처음에는 nullable로 추가한다.
- 신규 계정과 이전 계정을 구분할 수 있는 migration 상태를 기록한다.
- 로그인 실패 시 기존 계정과 새 계정의 오류를 동일하게 보여 계정 열거를 막는다.
- 비밀번호 원문이나 기존 세션 token은 이전하지 않는다.
- 이전 중에는 feature flag로 신규 Auth와 기존 Auth를 전환한다.

### 완료 기준

- 이메일 확인 전 protected mutation이 차단된다.
- 비밀번호 재설정이 계정 존재 여부를 노출하지 않는다.
- OAuth callback이 PKCE state와 redirect allowlist를 검증한다.
- 로그아웃·전체 세션 종료·탈퇴가 동작한다.
- 기존 사용자 데이터가 새 `auth_user_id`와 정확히 연결된다.

## 3단계. API 공통 보안 계층

### 공통 순서

```text
request id
  → body/query schema validation
  → authentication
  → role and ownership authorization
  → rate limit
  → idempotency key where needed
  → domain operation
  → structured response and log
```

### 적용 우선 API

- `/api/auth/*`
- `/api/uploads`
- `/api/animal-ai`
- `/api/applications*`
- `/api/verification`
- `/api/appeals*`
- `/api/family/*`
- `/api/community`
- `/api/cron/*`

### 완료 기준

- 모든 mutation에 입력 schema가 있다.
- 모든 사용자별 데이터 조회·수정에 소유권 검사가 있다.
- 실패 로그에는 비밀번호·token·증빙 URL이 포함되지 않는다.
- 동일 idempotency key 재요청이 중복 레코드를 만들지 않는다.

## 4단계. AI·동기화 작업 큐

### 목표

사용자 화면 요청과 외부 API 호출을 분리한다.

### 작업 상태

`pending → processing → completed | failed`

각 작업은 다음을 가진다.

- `job_id`
- `kind`
- `dedupe_key`
- `attempt_count`
- `next_attempt_at`
- `locked_until`
- `last_error_code`
- `completed_at`

### 처리 원칙

- 화면 요청은 enqueue와 현재 상태 조회만 수행한다.
- cron worker는 짧은 batch를 처리한다.
- 작업을 claim할 때 DB 조건부 update를 사용한다.
- `locked_until`이 지난 작업만 다시 처리한다.
- 외부 결과를 저장하기 전에 dedupe key를 확인한다.
- Vercel Cron의 UTC·중복 호출·무재시도 특성을 기준으로 설계한다.

## 5단계. 통합 테스트와 운영 전환

- Playwright: 가입, 이메일 확인, 로그인, 로그아웃, 보호 페이지, 신청, 증빙 업로드
- API: 비로그인, 본인, 다른 사용자, 운영자, 만료 세션
- Storage: public/private 접근과 signed URL 만료
- Job: 중복 호출, timeout, retry, stale lock
- UI: 320px, 390px, 480px, 키보드, 200% 확대, reduced motion
- CI: lint → unit/integration → build → migration dry run

## 롤백 원칙

- 단계별 feature flag를 둔다.
- Auth 이전 중에는 기존 로그인 경로를 즉시 되돌릴 수 있어야 한다.
- Storage 이전은 copy → verify → switch → retain old data 순서로 한다.
- AI 작업 스키마 변경은 구·신 worker가 같은 결과를 읽을 수 있게 한다.
- 운영 DB destructive migration은 별도 승인 없이는 실행하지 않는다.

## 현재 로컬 진행 결과

- 공개 미디어는 `public-media`, 증빙은 `private-evidence`를 사용하는 migration 초안을 추가했다.
- 기존 `uploads` 공개 파일은 URL 호환을 유지하고, 운영 데이터 확인 전에는 이동하거나 삭제하지 않는다.
- 업로드 API는 서버 MIME과 파일 signature를 함께 확인한다.
- AI 요청은 화면 요청에서 외부 모델을 직접 호출하지 않고 enqueue 후 cron worker가 처리하도록 바꾸었다.
- AI 상세 화면은 pending/processing 상태를 짧게 조회한다.
- 로그인·회원가입·업로드·AI enqueue에는 DB 기반 rate limit을 적용했다.
- 업로드·AI enqueue는 `Idempotency-Key`를 지원해 재시도 중복을 방지한다.
- 동일 키에 다른 요청 본문을 보내면 409로 거절하고, 처리 중인 요청은 재실행하지 않는다.

## 다음 승인 필요 작업

실제 운영 Supabase의 버킷·RLS·Auth 설정과 데이터 관계를 읽기 전용으로 확인한 뒤, 기존 증빙 파일을 `private-evidence`로 복사·검증할지 결정한다. 운영 데이터 확인 전에는 Auth provider 변경, 기존 파일 이동·삭제, custom auth 테이블 변경을 실행하지 않는다.
