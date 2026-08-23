import { getSupabaseServerClient } from "./server";

export const PUBLIC_MEDIA_BUCKET = "public-media";
export const PRIVATE_EVIDENCE_BUCKET = "private-evidence";
const LEGACY_PUBLIC_MEDIA_BUCKET = "uploads";

export function storageBucketForPublicKey(key: string) {
  return key.startsWith("public-media/") ? PUBLIC_MEDIA_BUCKET : LEGACY_PUBLIC_MEDIA_BUCKET;
}

export async function uploadStoredFile(
  bucket: string,
  key: string,
  data: ArrayBuffer,
  contentType: string,
) {
  const { error } = await getSupabaseServerClient().storage.from(bucket).upload(key, data, {
    contentType,
    cacheControl: "31536000",
    upsert: false,
  });
  if (error) throw error;
}

export async function downloadStoredFile(bucket: string, key: string) {
  return getSupabaseServerClient().storage.from(bucket).download(key);
}

export function publicStoredFileUrl(key: string) {
  return getSupabaseServerClient().storage.from(storageBucketForPublicKey(key)).getPublicUrl(key).data.publicUrl;
}

export function hasAllowedFileSignature(contentType: string, bytes: Uint8Array) {
  const isJpeg = bytes.length >= 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff;
  const isPng = bytes.length >= 8 && bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4e && bytes[3] === 0x47 && bytes[4] === 0x0d && bytes[5] === 0x0a && bytes[6] === 0x1a && bytes[7] === 0x0a;
  const isWebp = bytes.length >= 12 && bytes[0] === 0x52 && bytes[1] === 0x49 && bytes[2] === 0x46 && bytes[3] === 0x46 && bytes[8] === 0x57 && bytes[9] === 0x45 && bytes[10] === 0x42 && bytes[11] === 0x50;
  const isMp4 = bytes.length >= 12 && bytes[4] === 0x66 && bytes[5] === 0x74 && bytes[6] === 0x79 && bytes[7] === 0x70;
  const isWebm = bytes.length >= 4 && bytes[0] === 0x1a && bytes[1] === 0x45 && bytes[2] === 0xdf && bytes[3] === 0xa3;
  return contentType === "image/jpeg" ? isJpeg : contentType === "image/png" ? isPng : contentType === "image/webp" ? isWebp : contentType === "video/mp4" ? isMp4 : contentType === "video/webm" ? isWebm : false;
}
