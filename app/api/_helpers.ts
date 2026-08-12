export function clean(value: unknown, max = 4000) { return typeof value === "string" ? value.trim().slice(0, max) : ""; }

export async function readJson(request: Request): Promise<Record<string, unknown> | null> {
  try {
    const value = await request.json();
    return value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : null;
  } catch {
    return null;
  }
}

export function ownedUploadKey(key: string, userId: string, prefixes: string[]) {
  return prefixes.some(prefix => key.startsWith(`${prefix}/${userId}/`)) && !key.includes("..") && !key.includes("\\");
}
