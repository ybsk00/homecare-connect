import type { SupabaseClient } from '../client';

/**
 * 사용자의 알림 목록을 조회합니다.
 * @param client Supabase 클라이언트
 * @param userId 사용자 ID (auth.uid)
 * @param limit 최대 조회 건수 (기본 30)
 * @param offset 페이지네이션 오프셋
 */
export async function getNotifications(
  client: SupabaseClient,
  userId: string,
  limit = 30,
  offset = 0,
) {
  const { data, error, count } = await client
    .from('notifications')
    .select('*', { count: 'exact' })
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1);

  if (error) throw error;
  return { data, count };
}

/**
 * 알림을 읽음 처리합니다.
 * @param client Supabase 클라이언트
 * @param notificationId 알림 ID
 */
export async function markAsRead(client: SupabaseClient, notificationId: string) {
  const { data, error } = await client
    .from('notifications')
    .update({
      read: true,
      read_at: new Date().toISOString(),
    })
    .eq('id', notificationId)
    .select()
    .single();

  if (error) throw error;
  return data;
}

/**
 * 여러 알림을 한번에 읽음 처리합니다.
 * @param client Supabase 클라이언트
 * @param userId 사용자 ID
 */
export async function markAllAsRead(client: SupabaseClient, userId: string) {
  const { error } = await client
    .from('notifications')
    .update({
      read: true,
      read_at: new Date().toISOString(),
    })
    .eq('user_id', userId)
    .eq('read', false);

  if (error) throw error;
}

/**
 * 읽지 않은 알림 수를 조회합니다.
 * @param client Supabase 클라이언트
 * @param userId 사용자 ID (auth.uid)
 */
export async function getUnreadCount(client: SupabaseClient, userId: string) {
  const { count, error } = await client
    .from('notifications')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', userId)
    .eq('read', false);

  if (error) throw error;
  return count ?? 0;
}
