import type { HomeLocation } from "../../lib/geo";

let pending: Promise<HomeLocation | null> | null = null;

// The top bar and feed share the same first-visit request.
export function loadDefaultHomeLocation() {
  if (!pending) pending = fetch("/api/location/default", { signal: AbortSignal.timeout(4000) })
    .then(response => response.ok ? response.json() : null)
    .then(body => (body?.location as HomeLocation | null) || null)
    .catch(() => null)
    .finally(() => { pending = null; });
  return pending;
}
