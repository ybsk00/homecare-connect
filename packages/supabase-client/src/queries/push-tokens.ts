import type { SupabaseClient } from '../client';

/**
 * 푸시 토큰을 등록하거나 업데이트합니다.
 * 동일 사용자+토큰이 이미 있으면 업데이트, 없으면 생성합니다.
 * @param client Supabase 클라이언트
 * @param userId 사용자 ID
 * @param token Expo 푸시 토큰
 * @param deviceType 디바이스 타입
 */
export async function upsertPushToken(
  client: SupabaseClient,
  userId: string,
  token: string,
  deviceType: 'ios' | 'android',
) {
  const { data, error } = await client
    .from('push_tokens')
    .upsert(
      {
        user_id: userId,
        expo_push_token: token,
        device_type: deviceType,
        is_active: true,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'user_id,expo_push_token' },
    )
    .select()
    .single();

  if (error) throw error;
  return data;
}

/**
 * 푸시 토큰을 비활성화합니다 (로그아웃 시).
 * @param client Supabase 클라이언트
 * @param userId 사용자 ID
 * @param token Expo 푸시 토큰
 */
export async function deactivatePushToken(
  client: SupabaseClient,
  userId: string,
  token: string,
) {
  const { error } = await client
    .from('push_tokens')
    .update({
      is_active: false,
      updated_at: new Date().toISOString(),
    })
    .eq('user_id', userId)
    .eq('expo_push_token', token);

  if (error) throw error;
}

/**
 * 사용자의 활성 푸시 토큰 목록을 조회합니다.
 * @param client Supabase 클라이언트
 * @param userId 사용자 ID
 */
export async function getActivePushTokens(
  client: SupabaseClient,
  userId: string,
) {
  const { data, error } = await client
    .from('push_tokens')
    .select('expo_push_token, device_type')
    .eq('user_id', userId)
    .eq('is_active', true);

  if (error) throw error;
  return data;
}
