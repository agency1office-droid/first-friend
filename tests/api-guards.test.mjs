import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

test("protects high-cost API mutations with shared rate limits and idempotency", async () => {
  const guards = await readFile(new URL("../lib/api-guards.ts", import.meta.url), "utf8");
  const migration = await readFile(new URL("../supabase/migrations/20260823000200_api_guards.sql", import.meta.url), "utf8");
  const login = await readFile(new URL("../app/api/auth/login/route.ts", import.meta.url), "utf8");
  const register = await readFile(new URL("../app/api/auth/register/route.ts", import.meta.url), "utf8");
  const uploads = await readFile(new URL("../app/api/uploads/route.ts", import.meta.url), "utf8");
  const animalAi = await readFile(new URL("../app/api/animal-ai/route.ts", import.meta.url), "utf8");

  assert.match(guards, /consume_api_rate_limit/);
  assert.match(guards, /idempotency-key/);
  assert.match(guards, /status === "completed"/);
  assert.match(migration, /pg_advisory_xact_lock/);
  assert.match(migration, /unique \(scope, subject_hash, idempotency_key\)/);
  assert.match(login, /enforceRateLimit\("auth-login"/);
  assert.match(register, /enforceRateLimit\("auth-register"/);
  assert.match(uploads, /beginIdempotentRequest\("uploads"/);
  assert.match(animalAi, /beginIdempotentRequest\("animal-ai-enqueue"/);
  assert.match(animalAi, /completeIdempotentRequest/);
  assert.match(animalAi, /after\(async \(\) =>/);
  assert.match(animalAi, /processAnimalAiJob\(id, queued\.analysisKey \|\| undefined\)/);
});
