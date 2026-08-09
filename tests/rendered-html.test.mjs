import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

async function render(path = "/") {
  const workerUrl = new URL("../dist/server/index.js", import.meta.url);
  workerUrl.searchParams.set("test", `${process.pid}-${Date.now()}-${path}`);
  const { default: worker } = await import(workerUrl.href);
  return worker.fetch(new Request(`http://localhost${path}`, { headers: { accept: "text/html", host: "localhost" } }), { ASSETS: { fetch: async () => new Response("Not found", { status: 404 }) } }, { waitUntil() {}, passThroughOnException() {} });
}

test("server-renders the First Friend home experience", async () => {
  const response = await render();
  assert.equal(response.status, 200);
  const html = await response.text();
  assert.match(html, /퍼스트 프렌드/);
  assert.match(html, /마음속 친구를/);
  assert.match(html, /그려서 찾기/);
  assert.match(html, /지금 가족을 기다려요/);
  assert.doesNotMatch(html, /codex-preview|Your site is taking shape|react-loading-skeleton/i);
  assert.match(html, /og\.png/);
});

test("renders public discovery and safety principles", async () => {
  const [find, about] = await Promise.all([render("/find"), render("/about")]);
  assert.equal(find.status, 200);
  assert.equal(about.status, 200);
  const findHtml = await find.text();
  const aboutHtml = await about.text();
  assert.match(findHtml, /친구 찾기/);
  assert.match(findHtml, /건강이나 성격을 AI가 추측하지 않습니다/);
  assert.match(aboutHtml, /생명을 점수로 평가하지 않아요/);
  assert.match(aboutHtml, /정확한 위치와 연락처를 보호해요/);
});

test("keeps durable bindings and generated migration", async () => {
  const [hosting, migration, packageJson] = await Promise.all([
    readFile(new URL("../.openai/hosting.json", import.meta.url), "utf8"),
    readFile(new URL("../drizzle/0000_unique_rumiko_fujikawa.sql", import.meta.url), "utf8"),
    readFile(new URL("../package.json", import.meta.url), "utf8"),
  ]);
  assert.match(hosting, /"d1": "DB"/);
  assert.match(hosting, /"r2": "MEDIA"/);
  assert.match(migration, /CREATE TABLE `applications`/);
  assert.match(migration, /CREATE TABLE `lost_reports`/);
  assert.doesNotMatch(packageJson, /react-loading-skeleton/);
});
