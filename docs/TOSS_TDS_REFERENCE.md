# Toss TDS 로컬 레퍼런스

이 프로젝트는 SEED를 기본 디자인 시스템으로 사용한다. Toss TDS는 실행 의존성으로 설치하지 않고, 요청별 디자인 판단을 위한 보조 레퍼런스로 보관한다.

## 보관 위치

- 패키지 아카이브: `.codex-local/design-references/toss-tds`
- 보관 버전: `@toss/tds-mobile@2.5.1`, `@toss/tds-mobile-ait@2.5.1`
- 공식 문서: https://tossmini-docs.toss.im/tds-mobile/
- 컴포넌트 문서: https://tossmini-docs.toss.im/tds-mobile/components/

`.codex-local`은 로컬 레퍼런스 보관용으로 Git에 커밋하지 않는다. 패키지는 현재 React 19 기반 앱의 실행 코드에 import하지 않는다.

## 요청별 활용 기준

- 기본 컴포넌트, 색상, 간격, 아이콘: SEED
- SEED에 없는 패턴: TDS의 Badge, Button, Banner, CTA, 상태 표현을 우선 검토
- TDS에서 가져오는 것: 정보 위계, 컴포넌트 역할, 행동 우선순위, 상태 전달 방식
- TDS에서 그대로 가져오지 않는 것: TDS 전용 Provider, 앱인토스 전용 동작, SEED와 충돌하는 토큰

## 적용 체크

- 이 요청에 SEED recipe가 존재하는가?
- 없다면 TDS 레퍼런스에서 같은 사용자 목적을 해결하는 패턴을 확인했는가?
- 최종 화면은 SEED 토큰과 접근성 기준으로 통합했는가?
- TDS를 참고한 판단이 `docs/DESIGN_SYSTEM_STANDARD.md`의 우선순위와 충돌하지 않는가?
