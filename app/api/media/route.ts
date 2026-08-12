const allowedHost = "openapi.animal.go.kr";

export async function GET(request: Request) {
  const raw = new URL(request.url).searchParams.get("url");
  if (!raw) return new Response("missing url", { status: 400 });
  let source: URL;
  try { source = new URL(raw); } catch { return new Response("invalid url", { status: 400 }); }
  if (source.protocol !== "https:" || source.hostname !== allowedHost) return new Response("image host is not allowed", { status: 403 });
  try {
    const response = await fetch(source, { cache: "force-cache", signal: AbortSignal.timeout(15000) });
    if (!response.ok) return new Response("image unavailable", { status: 404 });
    const contentType = source.pathname.toLowerCase().endsWith(".png") ? "image/png" : source.pathname.toLowerCase().endsWith(".webp") ? "image/webp" : "image/jpeg";
    return new Response(response.body, { headers: { "content-type": contentType, "cache-control": "public, max-age=86400, s-maxage=604800, stale-while-revalidate=86400" } });
  } catch { return new Response("image unavailable", { status: 504 }); }
}
