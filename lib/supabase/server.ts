import { createClient } from "@supabase/supabase-js";

function serverEnv(name: string) {
  const value = process.env[name]?.trim();
  if (!value) throw new Error(`${name} 환경변수가 설정되지 않았습니다.`);
  return value;
}

/** 서버 전용 Supabase 클라이언트입니다. 이 파일을 클라이언트 컴포넌트에서 import하지 마세요. */
export function getSupabaseServerClient() {
  return createClient(
    serverEnv("NEXT_PUBLIC_SUPABASE_URL"),
    process.env.SUPABASE_SECRET_KEY?.trim() || serverEnv("SUPABASE_SERVICE_ROLE_KEY"),
    { auth: { autoRefreshToken: false, persistSession: false } },
  );
}
