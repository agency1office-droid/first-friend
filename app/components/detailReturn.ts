export const DETAIL_RETURN_SNAPSHOT_KEY = "ff-detail-return-snapshot-v1";

function safeDetailHref(value: string | null) {
  if (!value || !value.startsWith("/friends/") || value.startsWith("//")) return "";
  return value;
}

export function buildQuizHref(href: string) {
  if (typeof window === "undefined") return href;
  const url = new URL(href, window.location.origin);
  url.searchParams.set("return_to", `${window.location.pathname}${window.location.search}${window.location.hash}`);
  url.searchParams.set("return_scroll", String(Math.round(window.scrollY)));
  return `${url.pathname}${url.search}${url.hash}`;
}

export function openDetailFlow(href: string) {
  const destination = buildQuizHref(href);
  const isMobile = window.matchMedia("(max-width: 767px)").matches;
  if (isMobile) {
    window.location.assign(destination);
    return;
  }
  const flowWindow = window.open(destination, "_blank");
  if (!flowWindow) window.location.assign(destination);
}

export function closeToDetail() {
  if (typeof window === "undefined") return;
  const params = new URLSearchParams(window.location.search);
  const returnTo = safeDetailHref(params.get("return_to"));
  const returnScroll = Math.max(0, Number(params.get("return_scroll")) || 0);
  if (!returnTo) {
    window.location.replace("/");
    return;
  }
  try {
    window.sessionStorage.setItem(DETAIL_RETURN_SNAPSHOT_KEY, JSON.stringify({ href: returnTo, scrollY: returnScroll }));
  } catch {
    // Storage can be unavailable in private browsing; the destination still remains exact.
  }
  if (window.opener && !window.opener.closed) {
    window.close();
    return;
  }
  window.location.assign(returnTo);
}
