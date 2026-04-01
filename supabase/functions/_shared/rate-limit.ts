import type { SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2.49.0';
import { errorResponse } from './cors.ts';

const RATE_LIMIT_TABLE = 'agent_rate_limits';
const MAX_REQUESTS_PER_MINUTE = 5;
const WINDOW_SECONDS = 60;

/**
 * 사용자별 분당 요청 수를 제한합니다.
 * Supabase 테이블이 없으면 rate limit을 건너뜁니다 (graceful degradation).
 */
export async function checkRateLimit(
  supabase: SupabaseClient,
  userId: string,
  functionName: string,
): Promise<Response | null> {
  try {
    const windowStart = new Date(Date.now() - WINDOW_SECONDS * 1000).toISOString();

    const { count, error } = await supabase
      .from(RATE_LIMIT_TABLE)
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userId)
      .eq('function_name', functionName)
      .gte('created_at', windowStart);

    // 테이블이 없으면 rate limit 건너뜀
    if (error) {
      console.warn('Rate limit 체크 실패 (테이블 미존재 가능):', error.message);
      return null;
    }

    if ((count ?? 0) >= MAX_REQUESTS_PER_MINUTE) {
      return errorResponse(
        'RATE_LIMITED',
        `요청이 너무 많습니다. ${WINDOW_SECONDS}초 후 다시 시도해주세요.`,
        429,
      );
    }

    // 요청 기록
    await supabase.from(RATE_LIMIT_TABLE).insert({
      user_id: userId,
      function_name: functionName,
      created_at: new Date().toISOString(),
    });
  } catch {
    // rate limit 실패 시 요청은 허용 (graceful degradation)
    console.warn('Rate limit 처리 중 예외 발생, 요청을 허용합니다.');
  }

  return null;
}
