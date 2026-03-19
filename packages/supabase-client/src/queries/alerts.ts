import type { SupabaseClient } from '../client';

/**
 * 레드플래그 알림 목록을 조회합니다.
 * @param client Supabase 클라이언트
 * @param orgId 기관 ID
 * @param options 필터 옵션
 */
export async function getRedFlagAlerts(
  client: SupabaseClient,
  orgId: string,
  options?: {
    status?: 'active' | 'acknowledged' | 'resolved' | 'false_positive';
    severity?: 'yellow' | 'orange' | 'red';
    limit?: number;
    offset?: number;
  },
) {
  let query = client
    .from('red_flag_alerts')
    .select(
      `
      *,
      patient:patients (id, full_name, care_grade),
      nurse:profiles!red_flag_alerts_nurse_id_fkey (id, full_name)
    `,
    )
    .eq('org_id', orgId)
    .order('created_at', { ascending: false });

  if (options?.status) {
    query = query.eq('status', options.status);
  }
  if (options?.severity) {
    query = query.eq('severity', options.severity);
  }
  if (options?.limit) {
    query = query.limit(options.limit);
  }
  if (options?.offset) {
    query = query.range(options.offset, options.offset + (options.limit || 20) - 1);
  }

  const { data, error } = await query;

  if (error) throw error;
  return data;
}

/**
 * 레드플래그 알림을 확인(acknowledge) 처리합니다.
 * @param client Supabase 클라이언트
 * @param alertId 알림 ID
 * @param userId 확인한 사용자 ID
 */
export async function acknowledgeRedFlagAlert(
  client: SupabaseClient,
  alertId: string,
  userId: string,
) {
  const { data, error } = await client
    .from('red_flag_alerts')
    .update({
      status: 'acknowledged',
      acknowledged_by: userId,
      acknowledged_at: new Date().toISOString(),
    })
    .eq('id', alertId)
    .select()
    .single();

  if (error) throw error;
  return data;
}

/**
 * 레드플래그 알림을 해결(resolve) 처리합니다.
 * @param client Supabase 클라이언트
 * @param alertId 알림 ID
 * @param resolutionNote 해결 메모
 */
export async function resolveRedFlagAlert(
  client: SupabaseClient,
  alertId: string,
  resolutionNote: string,
) {
  const { data, error } = await client
    .from('red_flag_alerts')
    .update({
      status: 'resolved',
      resolution_note: resolutionNote,
      resolved_at: new Date().toISOString(),
    })
    .eq('id', alertId)
    .select()
    .single();

  if (error) throw error;
  return data;
}
