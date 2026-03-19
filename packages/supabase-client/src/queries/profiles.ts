import type { SupabaseClient } from '../client';
import type { TablesUpdate } from '@homecare/shared-types';

/**
 * 사용자 프로필을 조회합니다.
 * @param client Supabase 클라이언트
 * @param userId 사용자 ID (auth.uid)
 */
export async function getProfile(client: SupabaseClient, userId: string) {
  const { data, error } = await client
    .from('profiles')
    .select('*')
    .eq('id', userId)
    .single();

  if (error) throw error;
  return data;
}

/**
 * 사용자 프로필을 업데이트합니다.
 * @param client Supabase 클라이언트
 * @param userId 사용자 ID
 * @param updates 업데이트할 필드
 */
export async function updateProfile(
  client: SupabaseClient,
  userId: string,
  updates: TablesUpdate<'profiles'>,
) {
  const { data, error } = await client
    .from('profiles')
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq('id', userId)
    .select()
    .single();

  if (error) throw error;
  return data;
}
