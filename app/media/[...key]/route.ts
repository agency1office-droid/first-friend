import { publicStoredFileUrl } from "../../../lib/supabase/storage";

export async function GET(_: Request, { params }: { params: Promise<{ key: string[] }> }) { const { key } = await params; const objectKey = key.join("/"); if (!(objectKey.startsWith("public-media/") || objectKey.startsWith("uploads/")) || objectKey.includes("..")) return new Response("Not found", { status: 404 }); return Response.redirect(publicStoredFileUrl(objectKey), 302); }
