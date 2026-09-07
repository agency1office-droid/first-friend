# 동물 썸네일 운영

- 원본 `image_1`, `image_2`는 보존한다. 목록 API의 `thumbnail`만 최대 480px WebP(품질 78)를 가리키며 상세 갤러리는 원본을 쓴다.
- `animal-images/thumb-v1/<파일 내용 해시>.webp`에 저장한다. 기존 공개 저장소를 사용하며 파일은 1년 캐시한다. 변환 결과가 같으면 파일을 재사용한다.
- DB 트리거가 신규·변경 URL을 `animal_image_jobs`에 넣고 이전 썸네일 연결을 해제한다. 이전 URL의 작업은 `superseded`로 남긴다.
- Vercel Cron `/api/cron/animal-thumbnails`는 매일 19:30 UTC(한국 04:30)에 실행된다. `CRON_SECRET` Bearer 인증이 필요하다. 동물 동기화 예정 시각은 한국 04:00이다. 동기화가 늦어지면 다음 썸네일 실행에서 반영된다.
- 한 실행은 최대 200초 동안 새 작업을 가져오며 동시에 최대 8장, 최대 5,000건을 처리한다. 처리 중인 배치는 마무리하므로 실제 응답은 더 늦을 수 있다. 남은 작업은 다음 실행에서 이어간다.
- 중단된 작업은 10분 뒤 다시 가져온다. 실패는 최대 5회까지 지수 지연으로 재시도한다. 같은 URL의 내용 변경도 확인하도록 완료 후 30일이 지나면 재검사한다.
- 관리자 → 안전과 운영 → 동물 사진 변환에서 상태 필터·실패 이유·시도 횟수를 확인한다. 실패한 작업의 상세 검토 → 다시 시도로 재등록할 수 있다. 실제 변환은 다음 작업 실행에서 이루어진다.

## 최초 일괄 처리 또는 대기 작업 처리

정식 배포 및 DB 마이그레이션 완료 후 저장소 루트에서 실행한다.

```powershell
node --env-file=.env.local scripts/backfill-animal-thumbnails.mjs
```

운영 큐를 공유하므로 Cron과 겹쳐도 같은 작업을 동시에 가져오지 않는다. 공개 중인 동물부터 처리하며 저장소·DB에만 기록한다. 별도 서버를 배포하지 않는다. 진행 로그에는 사진 용량 합계와 성공·실패 건수만 출력한다. 실패 재시도 시간이 아직 오지 않았다면 종료할 수 있으므로 최종 상태는 관리자에서 확인한다.

## 장애 대응

원본 삭제·응답 지연·10MB 초과·지원하지 않는 형식은 실패 이유로 남는다. 허용 호스트 밖의 URL과 리다이렉트는 거부한다. 썸네일 로드 실패 시 목록은 원본으로 복구한다. 새 규격을 도입할 때는 경로 버전을 올린다. 기존 파일의 일괄 삭제는 하지 않는다.

Cron 한 번의 처리량보다 유입량이 지속해서 많으면 대기 건수가 누적된다. 요금제의 실행 주기·함수 시간·저장소 용량을 확인한 뒤 주기를 늘린다. 공개 저장소는 URL을 아는 사람이 접근할 수 있으므로 비공개 사진·신원 증빙을 이 큐에 넣지 않는다.

Vercel Hobby의 예약 실행에는 최대 1시간의 실행 시간대 유동성이 있다. Linux 네이티브 라이브러리는 `vite.config.ts`에서 패키지 전체를 포함하고, nf3의 다중 버전 폴더 구조에 맞춰 libvips 위치를 보정한다. 빌드가 완료될 때 배포할 Linux 바이너리를 직접 불러와 확인한다. 서버 실행 결과는 `sync.animal_thumbnails_complete` 로그에서 성공·실패·용량 합계를 확인한다. 엔진을 불러오지 못하면 작업을 가져오기 전에 중단한다.

## 수정 파일

- `lib/animal-thumbnails.ts`: 변환·저장·작업 처리
- `app/api/cron/animal-thumbnails/route.ts`: 인증된 예약 실행·운영 로그
- `supabase/migrations/20260908000100_animal_thumbnails.sql`: 자동 등록·작업 점유·재시도·원본 변경 처리
- `scripts/backfill-animal-thumbnails.mjs`: 기존 사진 일괄 처리
- `lib/public-animal-store.ts`, `lib/data.ts`: 원본과 별도 썸네일 주소 제공
- `app/components/AnimalCard.tsx`, `app/components/AnimalThumbnail.tsx`: 목록 표시·원본 복구
- `lib/image-url.ts`: 기존 이미지 규격 가정 정정
- `lib/operations.ts`, `app/components/OperationsConsole.tsx`, `app/api/operations/route.ts`: SEED 기반 작업 상태 확인·실패 재시도
- `vercel.json`, `vite.config.ts`: 예약 일정·Linux 이미지 엔진 배포
- `tests/animal-thumbnails.test.mjs`, `tests/animal-thumbnails.sql`, `tests/rendered-html.test.mjs`, `package.json`: 변환·권한·DB 회귀 검증
- `docs/ANIMAL_THUMBNAILS.md`: 운영 절차와 변경 내역
