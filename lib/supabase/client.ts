import { createClient } from "@supabase/supabase-js";

function publicEnv(name: string) {
  const value = process.env[name]?.trim();
  if (!value) throw new Error(`${name} 환경변수가 설정되지 않았습니다.`);
  return value;
}

/** 브라우저에서 사용할 수 있는 공개 Supabase 클라이언트입니다. */
export function getSupabaseClient() {
  return createClient(
    publicEnv("NEXT_PUBLIC_SUPABASE_URL"),
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY?.trim() || publicEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY"),
  );
}
