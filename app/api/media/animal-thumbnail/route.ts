import sharp from "sharp";

const allowedHost = "openapi.animal.go.kr";

function allowedSource(source: URL) {
  const host = source.hostname.toLowerCase();
  const configured = process.env.NEXT_PUBLIC_SUPABASE_URL;
  let storageHost = "";
  try { storageHost = configured ? new URL(configured).hostname.toLowerCase() : ""; } catch { /* invalid configuration */ }
  return host === allowedHost || host.endsWith(`.${allowedHost}`) || Boolean(storageHost && host === storageHost);
}

export async function GET(request: Request) {
  const raw = new URL(request.url).searchParams.get("url");
  if (!raw) return new Response("missing url", { status: 400 });
  let source: URL;
  try { source = new URL(raw); } catch { return new Response("invalid url", { status: 400 }); }
  if (source.protocol !== "https:" || !allowedSource(source)) return new Response("image host is not allowed", { status: 403 });
  try {
    const response = await fetch(source, { cache: "force-cache", signal: AbortSignal.timeout(15000) });
    if (!response.ok) return new Response("image unavailable", { status: 404 });
    const body = await sharp(Buffer.from(await response.arrayBuffer()), { failOn: "none" })
      .resize({ width: 480, height: 480, fit: "cover", position: "attention", withoutEnlargement: true })
      .webp({ quality: 76, effort: 3 })
      .toBuffer();
    return new Response(body, { headers: { "content-type": "image/webp", "content-length": String(body.byteLength), "cache-control": "public, max-age=604800, s-maxage=2592000, stale-while-revalidate=604800", "x-content-type-options": "nosniff" } });
  } catch { return new Response("image unavailable", { status: 504 }); }
}
