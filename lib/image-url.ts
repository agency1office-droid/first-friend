const PUBLIC_ANIMAL_IMAGE_HOST = "openapi.animal.go.kr";

export function optimizedAnimalImageUrl(value: string) {
  const normalized = value.trim().replace(/^http:\/\//i, "https://");
  // Full/detail images should come directly from the public API. Routing them
  // through a server-side image proxy adds another request and can make the
  // second gallery image appear late. Thumbnail generation remains separate.
  return normalized;
}

export function optimizedAnimalThumbnailUrl(value: string) {
  const normalized = value.trim().replace(/^http:\/\//i, "https://");
  // The public API already serves 400x300 JPEG images. Do not run them
  // through another resize/proxy step for list cards.
  return normalized;
}

export function optimizedAnimalDetailPreviewUrl(value: string) {
  const normalized = value.trim().replace(/^http:\/\//i, "https://");
  // The detail gallery uses the source image directly. Image conversion is
  // reserved for list thumbnails and must not sit in the detail-page path.
  return normalized;
}

/**
 * Resolve the larger image served by the official animal information site.
 * The public API image is intentionally a 400x300 preview; keep this URL out
 * of the initial page load and use it only after the user opens the viewer.
 */
export function originalAnimalImageUrl(value: string) {
  const normalized = value.trim().replace(/^http:\/\//i, "https://");
  try {
    const url = new URL(normalized);
    const marker = "/files/";
    const markerIndex = url.pathname.indexOf(marker);
    if (url.hostname.toLowerCase() !== "openapi.animal.go.kr" || markerIndex < 0) return normalized;
    const filePath = url.pathname.slice(markerIndex);
    return "https://www.animal.go.kr/front/fileMng/imageView.do?f=" + encodeURIComponent(filePath);
  } catch {
    return normalized;
  }
}
