import { hasAllowedFileSignature } from "./supabase/storage";

export async function readBoundedImage(response: Response, maxBytes = 10 * 1024 * 1024) {
  if (!response.body || Number(response.headers.get("content-length")) > maxBytes) throw new Error("Image size limit");
  const reader = response.body.getReader();
  const chunks: Uint8Array[] = [];
  let size = 0;
  try {
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      size += value.byteLength;
      if (size > maxBytes) throw new Error("Image size limit");
      chunks.push(value);
    }
  } finally { await reader.cancel(); }
  const body = Buffer.concat(chunks);
  const type = ["image/jpeg", "image/png", "image/webp"].find(type => hasAllowedFileSignature(type, body));
  if (!type) throw new Error("Unsupported image signature");
  return { body, type };
}
