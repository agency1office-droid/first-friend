import { getSupabaseServerClient } from "./server";

const bucket = "uploads";

export async function uploadStoredFile(
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

export async function downloadStoredFile(key: string) {
  return getSupabaseServerClient().storage.from(bucket).download(key);
}

export function publicStoredFileUrl(key: string) {
  return getSupabaseServerClient().storage.from(bucket).getPublicUrl(key).data.publicUrl;
}
