import { createClient, type SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2.49.0';
import { errorResponse } from './cors.ts';

export interface AuthResult {
  user: { id: string; email?: string };
  supabase: SupabaseClient;
  supabaseAuth: SupabaseClient;
}

/**
 * 요청의 Authorization 헤더를 검증하고 Supabase 클라이언트를 반환합니다.
 * 실패 시 적절한 에러 Response를 반환합니다.
 */
export async function authenticateRequest(req: Request): Promise<AuthResult | Response> {
  const authHeader = req.headers.get('Authorization');
  if (!authHeader) {
    return errorResponse('UNAUTHORIZED', '인증 토큰이 필요합니다.', 401);
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
  const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
  const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')!;

  const supabase = createClient(supabaseUrl, supabaseServiceKey);
  const supabaseAuth = createClient(supabaseUrl, supabaseAnonKey, {
    global: { headers: { Authorization: authHeader } },
  });

  const { data: { user }, error } = await supabaseAuth.auth.getUser();
  if (error || !user) {
    return errorResponse('UNAUTHORIZED', '유효하지 않은 인증 토큰입니다.', 401);
  }

  return { user: { id: user.id, email: user.email }, supabase, supabaseAuth };
}

/** AuthResult인지 Response(에러)인지 구분합니다. */
export function isAuthError(result: AuthResult | Response): result is Response {
  return result instanceof Response;
}
