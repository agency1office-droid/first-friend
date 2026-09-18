const allowedHost = "openapi.animal.go.kr";
const allowedWidths = new Set([320, 480, 960]);

function isAllowedHost(hostname: string) {
  const value = hostname.toLowerCase();
  return value === allowedHost || value.endsWith("." + allowedHost);
}

export async function GET(request: Request) {
  const params = new URL(request.url).searchParams, raw = params.get("url"), width = Number(params.get("w") || 0);
  if (!raw) return new Response("missing url", { status: 400 });
  let source: URL;
  try { source = new URL(raw); } catch { return new Response("invalid url", { status: 400 }); }
  if (source.protocol !== "https:" || !isAllowedHost(source.hostname) || source.username || source.password || source.port) return new Response("image host is not allowed", { status: 403 });
  try {
    const response = await fetch(source, { cache: "force-cache", redirect: "error", signal: AbortSignal.timeout(15000) });
    if (!response.ok) return new Response("image unavailable", { status: 404 });
    const headers = { "cache-control": "public, max-age=604800, s-maxage=2592000, stale-while-revalidate=604800", "x-content-type-options": "nosniff" };
    if (allowedWidths.has(width)) {
      // 썸네일 배치가 아직 안 돈 새 공고는 원본(2,000px JPEG 400KB)이 카드에 그대로 실린다. 요청한 폭으로 줄여 WebP로 돌려준다.
      const sharp = (await import("sharp")).default as typeof import("../../../node_modules/sharp/lib/index");
      const body = await sharp(new Uint8Array(await response.arrayBuffer()), { limitInputPixels: 40_000_000 }).rotate().resize({ width, withoutEnlargement: true }).webp({ quality: 78 }).toBuffer();
      return new Response(body, { headers: { ...headers, "content-type": "image/webp" } });
    }
    const pathname = String(source.pathname || "").toLowerCase();
    const contentType = pathname.endsWith(".png") ? "image/png" : pathname.endsWith(".webp") ? "image/webp" : "image/jpeg";
    return new Response(response.body, { headers: { ...headers, "content-type": contentType } });
  } catch { return new Response("image unavailable", { status: 504 }); }
}
