import type { SupabaseClient } from '../client';
import type { TablesInsert } from '@homecare/shared-types';

/**
 * 기관의 리뷰 목록을 조회합니다.
 * @param client Supabase 클라이언트
 * @param orgId 기관 ID
 * @param limit 최대 조회 건수 (기본 20)
 * @param offset 페이지네이션 오프셋
 */
export async function getReviewsByOrg(
  client: SupabaseClient,
  orgId: string,
  limit = 20,
  offset = 0,
) {
  const { data, error, count } = await client
    .from('reviews')
    .select(
      `
      *,
      guardian:profiles!reviews_guardian_id_fkey (
        full_name,
        avatar_url
      )
    `,
      { count: 'exact' },
    )
    .eq('org_id', orgId)
    .eq('is_visible', true)
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1);

  if (error) throw error;
  return { data, count };
}

/**
 * 리뷰를 작성합니다.
 * @param client Supabase 클라이언트
 * @param review 리뷰 데이터
 */
export async function createReview(
  client: SupabaseClient,
  review: TablesInsert<'reviews'>,
) {
  const { data, error } = await client
    .from('reviews')
    .insert(review)
    .select()
    .single();

  if (error) throw error;
  return data;
}

/**
 * 보호자가 작성한 리뷰 목록을 조회합니다.
 * @param client Supabase 클라이언트
 * @param guardianId 보호자 ID
 */
export async function getReviewsByGuardian(
  client: SupabaseClient,
  guardianId: string,
) {
  const { data, error } = await client
    .from('reviews')
    .select(
      `
      *,
      organization:organizations!reviews_org_id_fkey (
        id,
        name,
        org_type
      )
    `,
    )
    .eq('guardian_id', guardianId)
    .order('created_at', { ascending: false });

  if (error) throw error;
  return data;
}
