// Explicit capture only: no HTTP, DB, body, cookie, user or console integrations.
export async function reportServerError(code: string) {
  if (process.env.VERCEL_ENV !== "production") return false;
  const dsn = process.env.SENTRY_DSN || process.env.NEXT_PUBLIC_SENTRY_DSN;
  if (!dsn) return false;
  try {
    const Sentry = await import("@sentry/node");
    if (!Sentry.getClient()) Sentry.initWithoutDefaultIntegrations({
      dsn, environment: "production", defaultIntegrations: false,
      maxBreadcrumbs: 0, sendClientReports: false,
      beforeSend: event => ({
        type: event.type,
        event_id: event.event_id, timestamp: event.timestamp, platform: "node",
        environment: "production", level: "error", fingerprint: event.fingerprint,
        exception: { values: [{ type: "ServerError", value: "Server operation failed; inspect the operations dashboard" }] },
      }),
    });
    const safeCode = /^[a-z][a-z0-9_.]{0,79}$/.test(code) ? code : "server.request_failed";
    Sentry.captureException(new Error("Server operation failed"), { fingerprint: [safeCode] });
    return await Sentry.flush(2000);
  } catch { return false; }
}
