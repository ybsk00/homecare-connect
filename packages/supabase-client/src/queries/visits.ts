import type { SupabaseClient } from '../client';
import type { TablesInsert, TablesUpdate } from '@homecare/shared-types';

/**
 * 특정 간호사의 특정 날짜 방문 목록을 조회합니다.
 * 동선 최적화 순서(visit_order)로 정렬합니다.
 * @param client Supabase 클라이언트
 * @param nurseId 간호사 staff ID
 * @param date 날짜 (YYYY-MM-DD)
 */
export async function getVisitsByNurseDate(
  client: SupabaseClient,
  nurseId: string,
  date: string,
) {
  const { data, error } = await client
    .from('visits')
    .select(
      `
      *,
      patient:patients (
        id,
        full_name,
        address,
        address_detail,
        care_grade,
        mobility,
        primary_diagnosis,
        special_notes,
        phone
      ),
      visit_record:visit_records (
        id,
        vitals,
        performed_items,
        nurse_note
      )
    `,
    )
    .eq('nurse_id', nurseId)
    .eq('scheduled_date', date)
    .neq('status', 'cancelled')
    .order('visit_order', { ascending: true, nullsFirst: false });

  if (error) throw error;
  return data;
}

/**
 * 특정 환자의 방문 이력을 최신순으로 조회합니다.
 * @param client Supabase 클라이언트
 * @param patientId 환자 ID
 * @param limit 최대 조회 건수 (기본 20)
 * @param offset 페이지네이션 오프셋
 */
export async function getVisitsByPatient(
  client: SupabaseClient,
  patientId: string,
  limit = 20,
  offset = 0,
) {
  const { data, error, count } = await client
    .from('visits')
    .select(
      `
      *,
      nurse:staff (
        id,
        staff_type,
        user:profiles (
          full_name,
          avatar_url
        )
      ),
      visit_record:visit_records (
        id,
        vitals,
        performed_items,
        general_condition,
        nurse_note,
        message_to_guardian,
        photos,
        created_at
      )
    `,
      { count: 'exact' },
    )
    .eq('patient_id', patientId)
    .order('scheduled_date', { ascending: false })
    .range(offset, offset + limit - 1);

  if (error) throw error;
  return { data, count };
}

/**
 * 방문 상세 정보를 조회합니다.
 * @param client Supabase 클라이언트
 * @param visitId 방문 ID
 */
export async function getVisitDetail(client: SupabaseClient, visitId: string) {
  const { data, error } = await client
    .from('visits')
    .select(
      `
      *,
      patient:patients (
        id,
        full_name,
        birth_date,
        gender,
        address,
        address_detail,
        care_grade,
        mobility,
        primary_diagnosis,
        current_medications,
        allergies,
        special_notes,
        phone
      ),
      nurse:staff (
        id,
        staff_type,
        license_number,
        user:profiles (
          full_name,
          phone,
          avatar_url
        )
      ),
      service_plan:service_plans (
        id,
        care_items,
        goals,
        precautions
      ),
      visit_record:visit_records (
        *
      )
    `,
    )
    .eq('id', visitId)
    .single();

  if (error) throw error;
  return data;
}

/**
 * 방문 상태를 업데이트합니다.
 * @param client Supabase 클라이언트
 * @param visitId 방문 ID
 * @param status 새 상태
 * @param extras 추가 업데이트 필드 (checkin_at, checkin_location 등)
 */
export async function updateVisitStatus(
  client: SupabaseClient,
  visitId: string,
  status: 'scheduled' | 'en_route' | 'checked_in' | 'in_progress' | 'checked_out' | 'completed' | 'cancelled' | 'no_show',
  extras?: TablesUpdate<'visits'>,
) {
  const { data, error } = await client
    .from('visits')
    .update({
      status,
      updated_at: new Date().toISOString(),
      ...extras,
    })
    .eq('id', visitId)
    .select()
    .single();

  if (error) throw error;
  return data;
}

/**
 * 방문 기록을 생성합니다.
 * @param client Supabase 클라이언트
 * @param record 방문 기록 데이터
 */
export async function createVisitRecord(
  client: SupabaseClient,
  record: TablesInsert<'visit_records'>,
) {
  const { data, error } = await client
    .from('visit_records')
    .insert(record)
    .select()
    .single();

  if (error) throw error;
  return data;
}
