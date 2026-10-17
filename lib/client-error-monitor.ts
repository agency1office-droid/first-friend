import type { EventHint } from "@sentry/react";

const productionHosts = ["www.firstfriend.me", "firstfriend.me", "first-friend.vercel.app"];
let pending: Promise<typeof import("./client-sentry")> | undefined;
let started = false;

function enabled() {
  return Boolean(process.env.NEXT_PUBLIC_SENTRY_DSN) && typeof window !== "undefined"
    && productionHosts.includes(window.location.hostname);
}

function load() {
  if (!pending) pending = import("./client-sentry").then(sdk => {
    sdk.initialize();
    // The SDK now owns these listeners. Remove the temporary collectors in the
    // same task so an error cannot be reported by both sets of global handlers.
    window.removeEventListener("error", earlyError);
    window.removeEventListener("unhandledrejection", earlyRejection);
    return sdk;
  }).catch(error => { pending = undefined; throw error; });
  return pending;
}

export function reportClientError(error: unknown, hint?: EventHint) {
  if (!enabled()) return;
  // Retain the original error while the shared import resolves. An early error
  // starts monitoring immediately instead of waiting for the page load event.
  void load().then(sdk => sdk.captureException(error, hint)).catch(() => {});
}

function earlyError(event: ErrorEvent) {
  if (event.error || event.message) reportClientError(event.error || new Error(event.message), {
    mechanism: { handled: false, type: "onerror" },
  });
}

function earlyRejection(event: PromiseRejectionEvent) {
  reportClientError(event.reason, { mechanism: { handled: false, type: "onunhandledrejection" } });
}

export function startClientErrorMonitoring() {
  if (started || !enabled()) return;
  started = true;
  window.addEventListener("error", earlyError);
  window.addEventListener("unhandledrejection", earlyRejection);
  const start = () => { void load().catch(() => {}); };
  // Keep the full SDK off the initial image/font transfer path. Temporary
  // listeners above retain errors even before the SDK is downloaded.
  if (document.readyState === "complete") start();
  else window.addEventListener("load", start, { once: true });
}
