import type { SupabaseClient } from '../client';
import type { TablesInsert } from '@homecare/shared-types';

/**
 * AI 매칭 요청을 생성합니다.
 * service_requests 테이블에 레코드를 삽입하고 status='matching'으로 시작합니다.
 * @param client Supabase 클라이언트
 * @param request 서비스 요청 데이터
 */
export async function createMatchingRequest(
  client: SupabaseClient,
  request: TablesInsert<'service_requests'>,
) {
  const { data, error } = await client
    .from('service_requests')
    .insert({
      ...request,
      status: 'matching',
    })
    .select()
    .single();

  if (error) throw error;
  return data;
}

/**
 * AI 매칭 결과를 조회합니다.
 * find_matching_organizations DB 함수를 호출하여 최적 기관을 검색합니다.
 * @param client Supabase 클라이언트
 * @param patientId 환자 ID
 * @param radiusKm 검색 반경 (km, 기본 10)
 */
export async function getMatchingResults(
  client: SupabaseClient,
  patientId: string,
  radiusKm = 10,
) {
  const { data, error } = await client.rpc('find_matching_organizations', {
    p_patient_id: patientId,
    p_radius_km: radiusKm,
  });

  if (error) throw error;
  return data;
}

/**
 * 보호자가 매칭 결과에서 기관을 선택합니다.
 * service_request의 selected_org_id를 설정하고 상태를 sent_to_org로 변경합니다.
 * @param client Supabase 클라이언트
 * @param requestId 서비스 요청 ID
 * @param orgId 선택한 기관 ID
 */
export async function selectOrganization(
  client: SupabaseClient,
  requestId: string,
  orgId: string,
) {
  const now = new Date().toISOString();
  const expires = new Date(Date.now() + 48 * 60 * 60 * 1000).toISOString(); // 48시간 후 만료

  const { data, error } = await client
    .from('service_requests')
    .update({
      selected_org_id: orgId,
      status: 'sent_to_org',
      selected_at: now,
      sent_at: now,
      expires_at: expires,
      updated_at: now,
    })
    .eq('id', requestId)
    .select()
    .single();

  if (error) throw error;
  return data;
}

/**
 * 보호자의 서비스 요청 목록을 조회합니다.
 * @param client Supabase 클라이언트
 * @param guardianId 보호자 ID
 */
export async function getServiceRequests(
  client: SupabaseClient,
  guardianId: string,
) {
  const { data, error } = await client
    .from('service_requests')
    .select(
      `
      *,
      patient:patients (
        id,
        full_name,
        care_grade
      ),
      selected_org:organizations (
        id,
        name,
        org_type,
        rating_avg,
        review_count
      )
    `,
    )
    .eq('guardian_id', guardianId)
    .order('created_at', { ascending: false });

  if (error) throw error;
  return data;
}

/**
 * 기관이 서비스 요청에 응답합니다 (수락 또는 거절).
 * @param client Supabase 클라이언트
 * @param requestId 서비스 요청 ID
 * @param accepted 수락 여부
 * @param nurseId 배정할 간호사 ID (수락 시)
 */
export async function respondToRequest(
  client: SupabaseClient,
  requestId: string,
  accepted: boolean,
  nurseId?: string,
) {
  const now = new Date().toISOString();

  const { data, error } = await client
    .from('service_requests')
    .update({
      status: accepted ? 'org_accepted' : 'org_rejected',
      assigned_nurse_id: nurseId ?? null,
      responded_at: now,
      updated_at: now,
    })
    .eq('id', requestId)
    .select()
    .single();

  if (error) throw error;
  return data;
}
