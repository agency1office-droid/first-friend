export function optimizedAnimalImageUrl(value: string) {
  const normalized = value.trim().replace(/^http:\/\//i, "https://");
  // Full/detail images should come directly from the public API. Routing them
  // through a server-side image proxy adds another request and can make the
  // second gallery image appear late. Thumbnail generation remains separate.
  return normalized;
}

export function optimizedAnimalThumbnailUrl(value: string) {
  const normalized = value.trim().replace(/^http:\/\//i, "https://");
  // List cards receive a pre-generated Storage URL when available.
  // Never resize on the user's page request.
  return normalized;
}

export function optimizedAnimalDetailPreviewUrl(value: string) {
  const normalized = value.trim().replace(/^http:\/\//i, "https://");
  // Cache a bounded preview; the viewer still uses the original image.
  try {
    const url = new URL(normalized);
    if (url.protocol === "https:" && url.hostname === "openapi.animal.go.kr" && !url.port && !url.username && !url.password) return `/api/media?url=${encodeURIComponent(normalized)}&w=960`;
  } catch { /* Existing local/storage images keep their source. */ }
  return normalized;
}
