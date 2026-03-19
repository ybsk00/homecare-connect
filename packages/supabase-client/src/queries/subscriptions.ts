import type { SupabaseClient } from '../client';
import type { TablesUpdate } from '@homecare/shared-types';

/**
 * 기관의 현재 구독 정보를 조회합니다.
 * @param client Supabase 클라이언트
 * @param orgId 기관 ID
 */
export async function getSubscription(client: SupabaseClient, orgId: string) {
  const { data, error } = await client
    .from('subscriptions')
    .select('*')
    .eq('org_id', orgId)
    .order('created_at', { ascending: false })
    .limit(1)
    .single();

  if (error) throw error;
  return data;
}

/**
 * 구독 정보를 업데이트합니다.
 * @param client Supabase 클라이언트
 * @param subscriptionId 구독 ID
 * @param updates 업데이트할 필드
 */
export async function updateSubscription(
  client: SupabaseClient,
  subscriptionId: string,
  updates: TablesUpdate<'subscriptions'>,
) {
  const { data, error } = await client
    .from('subscriptions')
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq('id', subscriptionId)
    .select()
    .single();

  if (error) throw error;
  return data;
}

/**
 * 기관의 결제 이력을 조회합니다.
 * @param client Supabase 클라이언트
 * @param orgId 기관 ID
 * @param limit 최대 조회 건수 (기본 20)
 * @param offset 페이지네이션 오프셋
 */
export async function getPaymentHistory(
  client: SupabaseClient,
  orgId: string,
  limit = 20,
  offset = 0,
) {
  const { data, error, count } = await client
    .from('payment_history')
    .select('*', { count: 'exact' })
    .eq('org_id', orgId)
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1);

  if (error) throw error;
  return { data, count };
}
