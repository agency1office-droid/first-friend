# 퍼스트프렌드 — Claude Code 규칙

공통 규칙은 AGENTS.md가 원본이다. 아래는 그 규칙을 그대로 적용하고, Claude Code에서만 쓰는 도구를 덧붙인다.

@AGENTS.md

## Claude Code 전용 보강

- **디자인 시스템 확인:** SEED 컴포넌트·prop·토큰은 추측하지 말고 https://seed-design.io/llms.txt 에서 문서를 찾아 확인한다. 로컬 `seed-design/ui/*`가 실제 사용 가능한 컴포넌트 목록이다.
- **라이브러리 API:** vinext·Supabase·React 19처럼 자주 바뀌는 API는 Context7 MCP로 최신 문서를 확인한 뒤 쓴다.
- **프로젝트 스킬(자동 적용):** `.claude/skills/`의 `vercel-react-best-practices`(React·Next 성능 규칙), `web-design-guidelines`(UI 접근성·UX 점검), `supabase`, `supabase-postgres-best-practices`(RLS·RPC·마이그레이션·인덱스). 화면·DB 작업 전 해당 스킬을 먼저 따른다.
- **운영 DB:** 조회는 `.mcp.json`의 Supabase MCP(읽기 전용)로 한다. 쓰기(백필·정리)는 스크립트를 만들어 경로만 알리고 사용자가 실행한다.
- **자동 가드(`.claude/settings.json`):** 세션 시작 시 저장소 사전 확인이 출력된다. `git commit` 전에 커밋 대상 파일만 eslint·tsc를 돌리고, `git push` 전에 `npm test`를 돌린다. 실패하면 커밋·push가 막히니 원인과 로그를 보고한다. 가드 우회(`SKIP_FF_GATE=1`)는 사용자가 명시적으로 요청한 경우에만 쓴다.
- **병행 세션:** Codex가 같은 폴더에서 동시에 작업한다. 커밋은 `git commit -- <내 경로>` pathspec으로 내 파일만, 커밋 직전 `git fetch`로 뒤처짐 확인, 다른 세션의 미커밋 파일은 건드리지 않는다.
- **배포 확인:** push 후 `gh run watch`(Quality checks)와 Vercel 상태를 확인하고, https://www.firstfriend.me 에서 실제 동작을 검증한 뒤 보고한다.
