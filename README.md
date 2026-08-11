# 퍼스트 프렌드

UI 구현과 검수의 상시 기준은 [퍼스트프렌드 디자인 시스템 기준](docs/DESIGN_SYSTEM_STANDARD.md)을 따른다. SEED Foundations와 설치된 SEED 컴포넌트 recipe를 우선하며, Toss는 SEED에 적절한 패턴이 없을 때 정보 구조만 참고한다.

보호가 필요한 동물이 안전한 가족을 만나는 과정을 돕는 모바일 우선 입양 플랫폼입니다. 대한민국 공공데이터의 보호동물·분실동물·보호센터 정보를 가져오며, 그림·사진·조건 탐색부터 준비 교육, 신청, 전자 약정, 인계 확인까지 연결합니다.

## 실행

```bash
npm install
npm run dev
npm test
```

Node.js 22.13 이상이 필요합니다. 런타임에는 Sites의 `DB`(D1), `MEDIA`(R2), 비밀 환경변수 `PUBLIC_DATA_API_KEY`가 사용됩니다. 인증은 Sign in with ChatGPT의 서버 헤더를 사용합니다.

## 주요 경로

- `/find`: 온디바이스 그림·사진 태그 분석과 품종·털색·나이·성별·지역 찾기, 저장 검색
- `/readiness`: 생활 준비도, 비용 범위, 종별 교육·10문항 시험
- `/friends/:id`, `/apply/:id`, `/applications/:id`: 건강카드부터 신청·약정·인계까지
- `/lost-found`: 공공 분실동물, 안전 제보, 지역 알림, QR 전단지
- `/foster`: 임시보호자 교육과 직접 등록
- `/stories`: 공개 이야기, 응원, 신고
- `/verification`, `/operations`: 활동 역할 인증과 보호처 운영 콘솔(일반 회원은 명시된 데모)
- `/notifications`, `/shelters`, `/guide`, `/mypage`: 알림함, 보호센터, 전체 안내, 개인 대시보드

## 운영 원칙

정확한 개인 주소·연락처를 공개하지 않고, 공공데이터에 없는 건강·성격 정보는 추측하지 않습니다. 준비도 점수는 자동 탈락 기준이 아니며 입양 후 게시를 강제하지 않습니다. 사용자가 찾기에 올린 이미지는 서버로 전송하지 않고 기기에서 태그로 변환합니다. 보호처 전송·외부 알림·전문 운송·법적 서명 등록은 계약 전 더미 어댑터이며 코드와 UI에 명시되어 있습니다. 자세한 구현·운영 결정과 검증 결과는 [개선 구현 리포트](docs/IMPROVEMENT_IMPLEMENTATION_REPORT.md)를 참고하세요.
