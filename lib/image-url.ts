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
  return isPublicAnimalImage(normalized) ? `/api/media?url=${encodeURIComponent(normalized)}` : normalized;
}

export function optimizedAnimalThumbnailUrl(value: string) {
  const normalized = value.trim().replace(/^http:\/\//i, "https://");
  return isPublicAnimalImage(normalized) || isSupabaseStorageImage(normalized)
    ? `/api/media/animal-thumbnail?url=${encodeURIComponent(normalized)}`
    : normalized;
}

export function optimizedAnimalDetailPreviewUrl(value: string) {
  const normalized = value.trim().replace(/^http:\/\//i, "https://");
  return isPublicAnimalImage(normalized) || isSupabaseStorageImage(normalized)
    ? `/api/media/animal-thumbnail?variant=detail&url=${encodeURIComponent(normalized)}`
    : normalized;
}
