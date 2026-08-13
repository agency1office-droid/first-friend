const PUBLIC_ANIMAL_IMAGE_HOST = "openapi.animal.go.kr";

export function isPublicAnimalImage(value: string) {
  try { return new URL(value).hostname === PUBLIC_ANIMAL_IMAGE_HOST; } catch { return false; }
}

export function optimizedAnimalImageUrl(value: string) {
  return isPublicAnimalImage(value) ? `/api/media?url=${encodeURIComponent(value)}` : value;
}
