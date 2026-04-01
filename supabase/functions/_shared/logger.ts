/**
 * Edge Function 에러 로깅 유틸리티
 * Sentry 설정 전까지 console + Supabase audit_logs 사용
 */

import type { SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2.49.0';

export function logError(functionName: string, error: unknown, context?: Record<string, unknown>): void {
  const err = error instanceof Error ? error : new Error(String(error));
  console.error(`[${functionName}] ${err.message}`, {
    stack: err.stack,
    timestamp: new Date().toISOString(),
    ...context,
  });
}

export async function logErrorToDb(
  supabase: SupabaseClient,
  functionName: string,
  error: unknown,
  userId?: string,
): Promise<void> {
  try {
    const err = error instanceof Error ? error : new Error(String(error));
    await supabase.from('audit_logs').insert({
      user_id: userId ?? null,
      action: `edge_function_error:${functionName}`,
      details: {
        message: err.message,
        stack: err.stack?.substring(0, 500),
        timestamp: new Date().toISOString(),
      },
    });
  } catch {
    // 로깅 실패는 무시 (메인 요청 처리에 영향 주지 않음)
  }
}
