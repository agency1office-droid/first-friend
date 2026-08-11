const distinctImageCache = new Map<string, string[]>();

async function imageDigest(url: string) {
  const response = await fetch(url, { cache: "no-store", signal: AbortSignal.timeout(5000) });
  if (!response.ok) throw new Error(`Animal image returned ${response.status}`);
  const size = Number(response.headers.get("content-length") || 0);
  if (size > 8 * 1024 * 1024) throw new Error("Animal image is too large to compare");
  const digest = await crypto.subtle.digest("SHA-256", await response.arrayBuffer());
  return Array.from(new Uint8Array(digest), byte => byte.toString(16).padStart(2, "0")).join("");
}

export async function distinctAnimalImages(id: string, candidates: string[]) {
  const urls = Array.from(new Set(candidates.filter(Boolean)));
  const cacheKey = `${id}:${urls.join("|")}`;
  const cached = distinctImageCache.get(cacheKey);
  if (cached) return cached;
  if (urls.length < 2) return urls;
  const accepted: string[] = [], hashes = new Set<string>();
  for (const url of urls) {
    try {
      const hash = await imageDigest(url);
      if (!hashes.has(hash)) { hashes.add(hash); accepted.push(url); }
    } catch {
      // 검증할 수 없는 추가 사진은 중복 노출을 피하고 대표 사진만 유지합니다.
      if (!accepted.length) accepted.push(url);
    }
  }
  const result = accepted.length ? accepted : urls.slice(0, 1);
  distinctImageCache.set(cacheKey, result);
  return result;
}
