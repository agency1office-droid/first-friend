# 관리자 동기화 기록

주소: `/operations?view=sync` · 관리자 메뉴 **동기화 기록**

- 보호동물·실종동물 마지막 시작/성공 시각과 현재 상태.
- 실행별 시작·종료·소요 시간, 신규·재수집·수집 종료 건수, 처리 건수·페이지 수, 실패 이유.
- 이미지 전체 대기·처리 중·완료·실패 현황과 개별 실패 작업 메뉴 연결.
- 이미지 실행별 성공/실패, 성공 파일의 원본/변환 용량, 변환 규격(480px 이내, WebP, 품질 78, 원본 보존).
- 종류·상태 필터, 20개씩 페이지 이동, 새로고침. 시각은 한국 시간.

신규는 DB 최초 INSERT, 재수집은 기존 행의 수집 시각 갱신이다. 재수집이 반드시 원본 내용 변경을 뜻하지 않는다. 이미지 업로드나 운영자의 숨김만으로 재수집 건수가 증가하지 않는다. DB statement transition table로 배치별 집계해 동물 한 마리마다 기록을 갱신하지 않는다.

실종동물의 처리·페이지 수는 체크포인트의 누적 값이다. 신규·재수집 건수는 해당 실행에서 처리한 값이다. 실행 중 종료돼 마지막 상태를 남기지 못한 경우 완료로 추정하지 않고, 15분간 갱신되지 않은 진행 기록에 확인 안내를 표시한다.

이력은 적용 이후부터 남는다. 과거 추가/변환 건수·용량은 복원하거나 추정하지 않는다. 이전 마지막 성공 시각과 현재 이미지 작업 상태는 기존 DB 기록으로 표시한다. 이미지 실행 완료는 큐 전체 완료를 뜻하지 않으므로 전체 대기/실패 현황과 함께 확인한다. 실패 원인 표본은 최대 5개이며 개별 실패 메뉴에서 모든 작업을 조회한다.

접근: API에서 admin 검사, 응답 no-store, sync_runs RLS 및 anon/authenticated 접근 차단. service_role만 사용한다. 원본 URL이나 인증 키는 화면에 반환하지 않는다.

수정 파일: `OperationsConsole.tsx`, `OperationsSyncHistory.tsx`, `app/api/operations/route.ts`, `lib/sync-history.ts`, `lib/animal-thumbnails.ts`, `supabase/migrations/20260908000300_sync_history.sql`, `tests/sync-history.test.mjs`, `package.json`.

검증: SQL INSERT/upsert/UPDATE/비활성화/실패 및 체크포인트 중복 방지, 관리자/보호소/비로그인 API 권한, 이미지 전체/일부/치명적 실패, 페이지 필터, 모바일 SEED UI. `npm run lint`, `npm run typecheck`, `npm test` 실행. DB 마이그레이션을 먼저 배포하고 성공 확인 후 앱을 배포한다.

디자인: 설치된 SEED SideNavigation·ActionButton·Select·Badge·Callout과 기존 semantic token을 사용한다. TDS 및 신규 UI 의존성은 추가하지 않는다.
