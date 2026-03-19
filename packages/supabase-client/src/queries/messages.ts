import type { SupabaseClient } from '../client';
import type { TablesInsert } from '@homecare/shared-types';

/**
 * 특정 채널의 메시지 목록을 조회합니다.
 * @param client Supabase 클라이언트
 * @param channelId 채널 ID (환자-기관 간 대화 등)
 * @param limit 최대 조회 건수 (기본 50)
 * @param offset 페이지네이션 오프셋
 */
export async function getMessages(
  client: SupabaseClient,
  channelId: string,
  limit = 50,
  offset = 0,
) {
  const { data, error, count } = await client
    .from('messages')
    .select(
      `
      *,
      sender:profiles!messages_sender_id_fkey (
        id,
        full_name,
        avatar_url,
        role
      )
    `,
      { count: 'exact' },
    )
    .eq('channel_id', channelId)
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1);

  if (error) throw error;
  return { data, count };
}

/**
 * 메시지를 전송합니다.
 * @param client Supabase 클라이언트
 * @param message 메시지 데이터
 */
export async function sendMessage(
  client: SupabaseClient,
  message: TablesInsert<'messages'>,
) {
  const { data, error } = await client
    .from('messages')
    .insert(message)
    .select()
    .single();

  if (error) throw error;
  return data;
}

/**
 * 메시지를 읽음 처리합니다.
 * read_by 배열에 사용자 ID를 추가합니다.
 * @param client Supabase 클라이언트
 * @param channelId 채널 ID
 * @param userId 읽은 사용자 ID
 */
export async function markMessagesAsRead(
  client: SupabaseClient,
  channelId: string,
  userId: string,
) {
  // 읽지 않은 메시지 가져오기
  const { data: unread, error: fetchError } = await client
    .from('messages')
    .select('id, read_by')
    .eq('channel_id', channelId)
    .not('read_by', 'cs', `{${userId}}`);

  if (fetchError) throw fetchError;
  if (!unread || unread.length === 0) return;

  // 각 메시지의 read_by에 userId 추가
  const updates = unread.map((msg) =>
    client
      .from('messages')
      .update({ read_by: [...(msg.read_by ?? []), userId] })
      .eq('id', msg.id),
  );

  await Promise.all(updates);
}
