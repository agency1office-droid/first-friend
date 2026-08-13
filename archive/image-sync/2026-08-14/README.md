# 이미지 동기화 보관본

2026-08-14 기준으로 First Friend의 이미지 다운로드·변환·Supabase Storage 업로드 기능을 중단하면서 보관한 파일입니다.

- `animal-images-route.ts`: 과거 이미지 Storage 복사 Cron
- `animal-thumbnail-route.ts`: 과거 이미지 변환 프록시
- `animal-images.ts`: 과거 서버 측 이미지 다운로드·해시 중복 검사
- `20260812000100_animal_image_storage.sql`: Storage 버킷·이미지 경로 컬럼 마이그레이션
- `20260813000000_animal_image_jobs.sql`: 이미지 작업 큐 마이그레이션

현재 운영 코드는 `public_animals.image_1`, `public_animals.image_2`에 저장된 공공 API 이미지 주소를 그대로 사용합니다.
보호소·실종동물 텍스트 데이터 동기화는 유지합니다.

기존 Supabase Storage 파일과 DB의 과거 컬럼/테이블은 데이터 손실을 막기 위해 이번 작업에서 삭제하지 않았습니다.
