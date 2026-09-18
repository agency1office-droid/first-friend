// PreToolUse(Bash) 훅: git commit 전에는 커밋 대상 파일만 eslint·tsc로, git push 전에는 npm test로 검사해 실패하면 명령을 막는다.
// 우회는 사용자가 명시적으로 요청한 경우에만 명령 앞에 SKIP_FF_GATE=1 을 붙인다.
import { execFileSync, spawnSync } from "node:child_process";
import { existsSync, statSync } from "node:fs";
import path from "node:path";

const root = process.env.CLAUDE_PROJECT_DIR || process.cwd();
let raw = ""; for await (const chunk of process.stdin) raw += chunk;
const input = JSON.parse(raw || "{}");
const command = String(input.tool_input?.command || "");
if (input.tool_name !== "Bash" || /\bSKIP_FF_GATE=1\b/.test(command)) process.exit(0);
const isCommit = /\bgit\b[^|&;\n]*\bcommit\b/.test(command), isPush = /\bgit\b[^|&;\n]*\bpush\b/.test(command);
if (!isCommit && !isPush) process.exit(0);

const git = (...args) => execFileSync("git", args, { cwd: root, encoding: "utf8" }).split(/\r?\n/).filter(Boolean);
const run = (cmd, args, timeout) => spawnSync(cmd, args, { cwd: root, encoding: "utf8", shell: process.platform === "win32", timeout, maxBuffer: 64 * 1024 * 1024 });
const tail = (text, n = 40) => String(text || "").trim().split(/\r?\n/).slice(-n).join("\n");
function block(title, output) { process.stderr.write(`[ff-gate] ${title}\n${tail(output)}\n`); process.exit(2); }

if (isCommit) {
  // 커밋 대상 = 스테이징된 파일 + 명령에 적힌 경로(pathspec, 같은 명령의 git add). 다른 세션의 작업물은 검사하지 않는다.
  const tokens = [...command.matchAll(/"([^"]+)"|'([^']+)'|(\S+)/g)].map(m => m[1] ?? m[2] ?? m[3]).filter(t => !t.startsWith("-") && t !== "." && t !== "..");
  const files = new Set(git("diff", "--cached", "--name-only", "--diff-filter=ACMR"));
  for (const token of tokens) {
    const full = path.join(root, token);
    if (!existsSync(full)) continue;
    if (statSync(full).isDirectory()) git("ls-files", "--cached", "--others", "--exclude-standard", "--", token).forEach(f => files.add(f));
    else files.add(token.replaceAll(path.sep, "/"));
  }
  const code = [...files].filter(f => /\.(ts|tsx|mjs|cjs|js|jsx)$/.test(f) && !f.startsWith("node_modules/"));
  if (!code.length) process.exit(0);
  const lint = run("npx", ["eslint", ...code], 300000);
  if (lint.status !== 0) block("eslint 실패: 커밋이 막혔어요. 오류를 고친 뒤 다시 커밋하세요.", lint.stdout + lint.stderr);
  const tsc = run("npx", ["tsc", "-p", "tsconfig.check.json", "--pretty", "false"], 300000);
  if (tsc.status !== 0) {
    const mine = String(tsc.stdout + tsc.stderr).split(/\r?\n/).filter(line => code.some(f => line.replaceAll(path.sep, "/").startsWith(f + "(")));
    if (mine.length) block("타입 오류: 커밋이 막혔어요. 커밋 대상 파일의 오류만 표시합니다.", mine.join("\n"));
  }
  process.exit(0);
}

const test = run("npm", ["test"], 900000);
if (test.status !== 0) block("npm test 실패: push가 막혔어요. 원인과 로그를 사용자에게 보고하세요.", test.stdout + test.stderr);
