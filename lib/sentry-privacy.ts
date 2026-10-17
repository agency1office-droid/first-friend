import type { ErrorEvent } from "@sentry/react";

// Keep diagnostic locations, never request bodies, account data or free-text errors.
export function sanitizeSentryEvent(event: ErrorEvent): ErrorEvent {
  return {
    type: event.type,
    event_id: event.event_id,
    timestamp: event.timestamp,
    platform: "javascript",
    level: event.level,
    environment: event.environment,
    release: event.release,
    exception: {
      values: event.exception?.values?.map(exception => ({
        type: /^[A-Za-z]*Error$/.test(exception.type ?? "") ? exception.type : "Error",
        value: "Application error (message omitted for privacy)",
        stacktrace: {
          frames: exception.stacktrace?.frames?.map(frame => {
            let filename: string | undefined;
            try {
              const url = new URL(frame.filename ?? "");
              if (["www.firstfriend.me", "firstfriend.me", "first-friend.vercel.app"].includes(url.hostname)
                && /^\/assets\/[\w.-]+\.js$/.test(url.pathname)) filename = url.origin + url.pathname;
            } catch { /* Non-public source paths are deliberately omitted. */ }
            return { filename, lineno: frame.lineno, colno: frame.colno, in_app: frame.in_app };
          }),
        },
      })),
    },
  };
}
