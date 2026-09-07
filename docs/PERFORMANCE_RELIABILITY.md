# 속도·안정성 개선 (2026-09-08)

## 반영한 내용

- 홈 위치 조회를 공유하고 같은 위치로 인한 동물 목록 재요청을 방지한다. 위치 조회에는 4초 제한을 둔다.
- 카드 선조회도 썸네일을 사용한다. 선조회 실패는 실제 더보기에서 재시도한다.
- 스크롤 위치와 목록 저장을 분리해 스크롤마다 전체 목록을 직렬화하지 않는다. 저장소 오류가 탐색을 중단하지 않게 한다.
- 보호소·입양 진행 폼을 SEED 입력 규약에 맞추고 중복 제출을 차단한다. 실패한 입력은 유지하고 성공한 폼만 초기화한다.
- 크기·중성화·나이·체중 검색을 DB에서 처리한다. 빈 결과를 전체 목록 검색으로 바꾸지 않는다. 동일 시각 커서 누락과 미상 거리 0m 표시도 바로잡는다.
- 운영 요약은 대기 업무부터 집계하고 전체 기록은 펼칠 때 조회한다.
- 인증 과정에서 조회한 회원을 서버에서 재사용한다. 클라이언트에 반환하는 사용자 필드는 기존 네 개만 유지한다.
- 나의 페이지의 불필요한 회원 upsert를 제거하고 신청은 최신 5건만 읽되 전체 건수는 별도로 유지한다.
- 공공 API 총건수 오류·0건 수집 시 기존 동물을 비활성화하지 않는다.
- 실종 동기화는 미완료 조회 범위를 유지해 다음날에도 재개하고 시간 제한 전에 체크포인트를 저장한다.
- AI 설명의 DB 저장 실패를 성공으로 표시하지 않는다.
- 인증 DB 장애를 세션 만료로 위장하지 않고 재시도 가능한 오류로 처리한다.
- 운영 앱의 타입 검사와 실제 Vercel 빌드·생성 함수 smoke 검사를 CI에 추가한다.

## 수정 파일과 이유

| 파일 | 목적 |
|---|---|
| `app/components/HomeTopbar.tsx`, `defaultHomeLocation.ts`, `useAnimalFeed.ts` | 홈 중복 요청·원본 선조회·스크롤 저장 비용·선조회 실패 처리 |
| `app/components/ShelterManager.tsx`, `ApplicationProgress.tsx` | SEED 폼 입력, 초기값, 성공·실패 상태, 중복 제출 |
| `lib/public-animal-store.ts`, `supabase/migrations/20260908000200_complete_animal_search.sql` | DB 검색·커서·동기화 데이터 보존과 재개 |
| `app/api/operations/route.ts`, `app/components/OperationsOverview.tsx` | 필요한 집계 먼저 조회·회원 조회 재사용 |
| `lib/app-auth.ts`, `app/chatgpt-auth.ts`, `app/api/profile/route.ts`, `app/error.tsx` | 인증 인프라 장애 구분·조회 재사용·재시도 안내 |
| `app/mypage/page.tsx`, `lib/animal-ai.ts`, `app/api/cron/public-lost-animals/route.ts` | 불필요한 DB 쓰기·조회 제거, 저장 성공 판정, 체크포인트 응답 |
| `lib/data.ts`, `lib/public-data.ts`, `lib/geo.ts`, `lib/animal-thumbnails.ts` | 실제 사용 데이터와 설치된 라이브러리 타입 정합성 |
| `app/components/Finder.tsx`, `FosterRegistration.tsx`, `FamilyRoom.tsx`, `InfoBoard.tsx`, `ShelterLocationCard.tsx` | 이미지 생성자·입력 조건·설치된 SEED/지도 API 규약 오류 |
| `app/encyclopedia/page.tsx`, `app/guide/page.tsx`, `app/friends/[id]/page.tsx` | Accordion 초기값과 지도 props 정합성 |
| `app/lost-found/page.tsx`, `app/mypage/help/page.tsx`, `app/mypage/reputation/page.tsx`, `app/shelters/[id]/page.tsx` | DB null/unknown 결과의 안전한 렌더링 |
| `seed-design/ui/app-bar.tsx`, `app-screen.tsx`, `callout.tsx`, `side-navigation.tsx`, `text-field.tsx` | 설치된 Stackflow API와 SEED 링크·key·입력 초기값 규약 |
| `package.json`, `tsconfig.check.json`, `.github/workflows/quality.yml`, `scripts/check-vercel-build.mjs` | 운영 앱 타입·Linux 배포 경로·생성 함수 검증 |
| `tests/frontend-performance.test.mjs`, `animal-search.test.mjs`, `animal-search.sql`, `runtime-reliability.test.mjs`, `operations.test.mjs`, `rendered-html.test.mjs` | 오류 재현·검색 정합성·권한·폼/런타임 회귀 검증 |

## 검증과 배포

1. `npm run lint`, `npm run typecheck`, `npm test`.
2. 검색 SQL은 PGlite에서 기존 함수 + 새 마이그레이션 + SQL 회귀 테스트로 확인. PostGIS 거리 계산은 기존 구현을 유지하며 이 로컬 테스트에서는 stub한다. 운영의 실제 거리·필터도 별도로 확인한다.
3. `NITRO_PRESET=vercel npm run build` 후 `node scripts/check-vercel-build.mjs`. CI Linux 빌드에서는 실제 Sharp 바이너리 로딩도 기존 빌드 assertion으로 확인한다.
4. DB 마이그레이션만 먼저 GitHub main push하고 적용 성공 확인 후 앱을 push한다. 기존 RPC는 구버전 앱을 위해 유지한다.
5. 운영 홈페이지, 공개 API, 빈 검색·상세 필터, 모바일 첫 사진·중복 요청·스크롤 원본 요청을 재측정한다. 보호소·입양 쓰기 검증은 운영 데이터 대신 격리한 브라우저 fixture를 사용한다.

타입 검사는 운영 앱·lib·SEED·빌드 설정과 그 의존성을 검사한다. 보관된 과거 코드와 운영에서 사용하지 않는 Cloudflare Worker/D1 진입점은 별도 플랫폼 범위이며 이 검사에 포함하지 않는다. 운영 앱 오류를 무시하거나 any로 덮지 않는다.

## 보류 및 한계

- 공개 목록 CDN 캐시는 추가하지 않는다. 관리자 숨김 조치의 즉시 반영을 유지하며, 중복 요청·DB 전체 다운로드 제거 효과부터 측정한다.
- 실측은 로컬 Chrome의 모바일 화면 크기와 소량 GET 기준이다. 실제 저사양 휴대폰, 이동통신망, 동시 사용자 부하의 개선율을 보장하지 않는다.
- 보호소·입양 쓰기는 fixture로 검증한다. 실제 회원 데이터의 임의 변경·메시지 발송은 하지 않는다.
- UI는 설치된 SEED를 유지한다. TDS나 새 UI·캐시 프레임워크는 추가하지 않는다.
