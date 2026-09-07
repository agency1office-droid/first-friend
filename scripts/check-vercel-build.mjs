import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const config = JSON.parse(await readFile(new URL("../.vercel/output/config.json", import.meta.url), "utf8"));
assert.ok(config.routes?.some(route => route.dest), "Vercel must route requests to a function");
const { default: handler } = await import("../.vercel/output/functions/__server.func/index.mjs");
const home = await handler.fetch(new Request("https://firstfriend.test/"));
assert.equal(home.status, 200);
assert.match(await home.text(), /class="ff-page ff-home-page"/);
const forbidden = await handler.fetch(new Request("https://firstfriend.test/api/cron/animal-thumbnails"));
assert.equal(forbidden.status, 403, "Cron must enforce its secret in the generated function");
console.log("PASS Vercel routing, homepage rendering and protected API");
