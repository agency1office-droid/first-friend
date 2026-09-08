// The HTTP-only session remains authoritative; this value only separates UI caches.
let request: Promise<string> | undefined;

export function readDisplayScope() {
  if (typeof document === "undefined") return undefined;
  const value = document.cookie?.match(/(?:^|;\s*)ff_display_scope=([^;]+)/)?.[1];
  const scope = value && /^(guest|[a-f0-9]{24})$/.test(value) ? value : document.body.dataset.favoriteScope;
  if (scope) document.body.dataset.favoriteScope = scope;
  return scope;
}

export function ensureDisplayScope(refresh = false): Promise<string> {
  if (!refresh && request) return request;
  const scope = readDisplayScope();
  if (!refresh && scope) return Promise.resolve(scope);
  if (typeof document === "undefined") return Promise.resolve("guest");
  if (refresh) request = undefined;
  if (!request) {
    const current = fetch("/api/auth/display-scope", { cache: "no-store" }).then(async response => {
      if (!response.ok) throw new Error("로그인 표시를 확인하지 못했어요.");
      const body = await response.json() as { scope?: string };
      if (!body.scope || !/^(guest|[a-f0-9]{24})$/.test(body.scope)) throw new Error("로그인 표시를 확인하지 못했어요.");
      if (request === current) document.body.dataset.favoriteScope = body.scope;
      return body.scope;
    }).finally(() => { if (request === current) request = undefined; });
    request = current;
  }
  return request;
}
