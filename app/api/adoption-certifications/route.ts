import { getChatGPTUser } from "../../chatgpt-auth";
import { getSupabaseServerClient } from "../../../lib/supabase/server";
import { clean } from "../_helpers";

async function hash(value: string) { const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value.trim().toUpperCase())); return Array.from(new Uint8Array(digest), v => v.toString(16).padStart(2, "0")).join(""); }

export async function GET() {
  const user = await getChatGPTUser();
  if (!user) return Response.json({ error: "본인 확인이 필요합니다." }, { status: 401 });
  const { data: certifications } = await getSupabaseServerClient().from("adoption_certifications").select("*").eq("member_id", user.userId).order("created_at", { ascending: false });
  return Response.json({ certifications: certifications || [] });
}

export async function POST(request: Request) {
  const user = await getChatGPTUser();
  if (!user) return Response.json({ error: "본인 확인이 필요합니다." }, { status: 401 });
  const data = await request.json() as Record<string, unknown>, shelterName = clean(data.shelterName, 120), animalName = clean(data.animalName, 80), verificationCode = clean(data.verificationCode, 80), evidenceKey = clean(data.evidenceKey, 240);
  if (!shelterName || !animalName || verificationCode.length < 6 || !evidenceKey) return Response.json({ error: "보호소·동물·인증코드·입양 증빙을 모두 확인해 주세요." }, { status: 400 });
  const { data: certification, error } = await getSupabaseServerClient().from("adoption_certifications").insert({ member_id: user.userId, source: "external", shelter_name: shelterName, animal_name: animalName, verification_code_hash: await hash(verificationCode), evidence_key: evidenceKey }).select("*").single();
  if (error) return Response.json({ error: "입양 인증을 저장하지 못했어요." }, { status: 500 });
  return Response.json({ certification }, { status: 201 });
}
