type ObservabilityContext = Record<string, string | number | boolean | undefined>;

const SENSITIVE_KEYS = /token|secret|password|authorization|cookie|email|phone|message/i;

function sanitize(context: ObservabilityContext) {
  return Object.fromEntries(
    Object.entries(context).filter(([key, value]) => !SENSITIVE_KEYS.test(key) && value !== undefined),
  );
}

export function requestId(request?: Request) {
  const supplied = request?.headers.get("x-request-id")?.trim();
  return supplied && /^[A-Za-z0-9._:-]{8,120}$/.test(supplied) ? supplied : crypto.randomUUID();
}

export function logEvent(event: string, context: ObservabilityContext = {}) {
  console.info(JSON.stringify({
    type: "first-friend.event",
    event,
    at: new Date().toISOString(),
    ...sanitize(context),
  }));
}

export function logError(event: string, error: unknown, context: ObservabilityContext = {}) {
  const errorMessage = error instanceof Error ? error.message : String(error);
  console.error(JSON.stringify({
    type: "first-friend.error",
    event,
    at: new Date().toISOString(),
    error: errorMessage,
    ...sanitize(context),
  }));
}
