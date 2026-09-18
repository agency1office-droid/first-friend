// SessionStart 훅: 작업 전 확인 항목(경로·remote·브랜치·상태·최근 커밋)을 세션 시작 때 자동으로 컨텍스트에 넣는다.
import { execFileSync, spawnSync } from "node:child_process";

const root = process.env.CLAUDE_PROJECT_DIR || process.cwd();
const git = (...args) => { try { return execFileSync("git", args, { cwd: root, encoding: "utf8", timeout: 15000 }).trim(); } catch { return ""; } };

spawnSync("git", ["fetch", "-q", "origin", "main"], { cwd: root, timeout: 15000 });
const status = git("status", "--short").split(/\r?\n/).filter(Boolean);
const [behind = "?", ahead = "?"] = git("rev-list", "--left-right", "--count", "origin/main...HEAD").split(/\s+/);
const lines = [
  `[퍼스트프렌드 사전 확인] 경로 ${root}`,
  `remote: ${git("remote", "get-url", "origin") || "(확인 실패)"}`,
  `브랜치: ${git("branch", "--show-current") || "?"} · origin/main 대비 ahead ${ahead} / behind ${behind}`,
  "최근 커밋:", git("log", "--oneline", "-3"),
  `미커밋 변경 ${status.length}건` + (status.length ? " (다른 세션 작업물일 수 있으니 덮어쓰지 말 것):" : ""),
  ...status.slice(0, 15), status.length > 15 ? `… 외 ${status.length - 15}건` : "",
  "자동 가드: git commit 전 커밋 대상 파일 eslint·tsc, git push 전 npm test.",
];
console.log(lines.filter(Boolean).join("\n"));
