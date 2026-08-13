const PUBLIC_ANIMAL_IMAGE_HOST = "openapi.animal.go.kr";

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
