const allowedHost = "openapi.animal.go.kr";

function isAllowedHost(hostname: string) {
  const value = hostname.toLowerCase();
  return value === allowedHost || value.endsWith(`.${allowedHost}`);
}

export async function GET(request: Request) {
  const raw = new URL(request.url).searchParams.get("url");
  if (!raw) return new Response("missing url", { status: 400 });
  let source: URL;
  try { source = new URL(raw); } catch { return new Response("invalid url", { status: 400 }); }
  if (source.protocol !== "https:" || !isAllowedHost(source.hostname)) return new Response("image host is not allowed", { status: 403 });
  try {
    const response = await fetch(source, { cache: "force-cache", signal: AbortSignal.timeout(15000) });
    if (!response.ok) return new Response("image unavailable", { status: 404 });
    const pathname = String(source.pathname || "").toLowerCase();
    const contentType = pathname.endsWith(".png") ? "image/png" : pathname.endsWith(".webp") ? "image/webp" : "image/jpeg";
    return new Response(response.body, { headers: { "content-type": contentType, "cache-control": "public, max-age=604800, s-maxage=2592000, stale-while-revalidate=604800", "x-content-type-options": "nosniff" } });
  } catch { return new Response("image unavailable", { status: 504 }); }
}
