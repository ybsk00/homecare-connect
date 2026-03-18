import type { SupabaseClient } from '../client';

/**
 * 기관 상세 정보를 조회합니다.
 * @param client Supabase 클라이언트
 * @param orgId 기관 ID
 */
export async function getOrganization(client: SupabaseClient, orgId: string) {
  const { data, error } = await client
    .from('organizations')
    .select(
      `
      *,
      reviews (
        id,
        rating,
        content,
        rating_quality,
        rating_punctuality,
        rating_communication,
        rating_kindness,
        created_at,
        guardian:profiles (
          full_name,
          avatar_url
        )
      )
    `,
    )
    .eq('id', orgId)
    .single();

  if (error) throw error;
  return data;
}

/**
 * 기관 목록을 검색합니다.
 * @param client Supabase 클라이언트
 * @param params 검색 조건
 */
export async function searchOrganizations(
  client: SupabaseClient,
  params: {
    query?: string;
    org_type?: string;
    services?: string[];
    verification_status?: string;
    limit?: number;
    offset?: number;
  },
) {
  let query = client
    .from('organizations')
    .select('*', { count: 'exact' });

  if (params.query) {
    query = query.ilike('name', `%${params.query}%`);
  }

  if (params.org_type) {
    query = query.eq('org_type', params.org_type);
  }

  if (params.services && params.services.length > 0) {
    query = query.overlaps('services', params.services);
  }

  if (params.verification_status) {
    query = query.eq('verification_status', params.verification_status);
  }

  const limit = params.limit ?? 20;
  const offset = params.offset ?? 0;

  const { data, error, count } = await query
    .order('rating_avg', { ascending: false })
    .range(offset, offset + limit - 1);

  if (error) throw error;
  return { data, count };
}

/**
 * 기관 소속 환자 목록을 조회합니다.
 * service_plans 테이블을 통해 연결된 환자를 가져옵니다.
 * @param client Supabase 클라이언트
 * @param orgId 기관 ID
 */
export async function getOrgPatients(client: SupabaseClient, orgId: string) {
  const { data, error } = await client
    .from('service_plans')
    .select(
      `
      id,
      status,
      visit_frequency,
      start_date,
      nurse:staff (
        id,
        user:profiles (
          full_name
        )
      ),
      patient:patients (
        id,
        full_name,
        birth_date,
        gender,
        care_grade,
        mobility,
        primary_diagnosis,
        needed_services,
        address,
        status
      )
    `,
    )
    .eq('org_id', orgId)
    .eq('status', 'active')
    .order('created_at', { ascending: false });

  if (error) throw error;
  return data;
}

/**
 * 기관 소속 직원(의료진) 목록을 조회합니다.
 * @param client Supabase 클라이언트
 * @param orgId 기관 ID
 */
export async function getOrgStaff(client: SupabaseClient, orgId: string) {
  const { data, error } = await client
    .from('staff')
    .select(
      `
      id,
      staff_type,
      license_number,
      specialties,
      max_patients,
      current_patient_count,
      is_active,
      joined_at,
      user:profiles (
        id,
        full_name,
        phone,
        avatar_url
      )
    `,
    )
    .eq('org_id', orgId)
    .order('is_active', { ascending: false })
    .order('joined_at', { ascending: true });

  if (error) throw error;
  return data;
}
