import { createClient } from '@supabase/supabase-js';
import type { Database } from '@homecare/shared-types';

/**
 * 타입 안전한 Supabase 클라이언트를 생성합니다.
 * 앱별로 환경변수에서 URL과 Key를 전달하여 사용합니다.
 *
 * @example
 * // Next.js (웹)
 * const supabase = createSupabaseClient(
 *   process.env.NEXT_PUBLIC_SUPABASE_URL!,
 *   process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
 * );
 *
 * @example
 * // Expo (모바일)
 * const supabase = createSupabaseClient(
 *   process.env.EXPO_PUBLIC_SUPABASE_URL!,
 *   process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY!
 * );
 */
export function createSupabaseClient(supabaseUrl: string, supabaseKey: string) {
  return createClient<Database>(supabaseUrl, supabaseKey);
}

/**
 * 서비스 롤 키를 사용하는 관리자용 Supabase 클라이언트를 생성합니다.
 * RLS를 우회하므로 Edge Function 또는 서버 사이드에서만 사용해야 합니다.
 */
export function createSupabaseAdmin(supabaseUrl: string, serviceRoleKey: string) {
  return createClient<Database>(supabaseUrl, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}

/** Supabase 클라이언트 타입 */
export type SupabaseClient = ReturnType<typeof createSupabaseClient>;
