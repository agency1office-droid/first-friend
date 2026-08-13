const PUBLIC_ANIMAL_IMAGE_HOST = "openapi.animal.go.kr";

function isSupabaseStorageImage(value: string) {
  try {
    const configured = process.env.NEXT_PUBLIC_SUPABASE_URL;
    return Boolean(configured && new URL(value).hostname === new URL(configured).hostname);
  } catch { return false; }
}

export function isPublicAnimalImage(value: string) {
  try {
    const hostname = new URL(value).hostname.toLowerCase();
    return hostname === PUBLIC_ANIMAL_IMAGE_HOST || hostname.endsWith(`.${PUBLIC_ANIMAL_IMAGE_HOST}`);
  } catch { return false; }
}

export function optimizedAnimalImageUrl(value: string) {
  const normalized = value.trim().replace(/^http:\/\//i, "https://");
  // Full/detail images should come directly from the public API. Routing them
  // through a server-side image proxy adds another request and can make the
  // second gallery image appear late. Thumbnail generation remains separate.
  return normalized;
}

export function optimizedAnimalThumbnailUrl(value: string) {
  const normalized = value.trim().replace(/^http:\/\//i, "https://");
  return isPublicAnimalImage(normalized) || isSupabaseStorageImage(normalized)
    ? `/api/media/animal-thumbnail?url=${encodeURIComponent(normalized)}`
    : normalized;
}

export function optimizedAnimalDetailPreviewUrl(value: string) {
  const normalized = value.trim().replace(/^http:\/\//i, "https://");
  // The detail gallery uses the source image directly. Image conversion is
  // reserved for list thumbnails and must not sit in the detail-page path.
  return normalized;
}
