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
  // The detail gallery uses the source image directly. Image conversion is
  // reserved for list thumbnails and must not sit in the detail-page path.
  return normalized;
}
