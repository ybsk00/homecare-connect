import type { SupabaseClient } from '../client';
import type { Tables, TablesInsert, TablesUpdate } from '@homecare/shared-types';

/**
 * 환자 상세 정보를 조회합니다.
 * @param client Supabase 클라이언트
 * @param patientId 환자 ID
 */
export async function getPatient(client: SupabaseClient, patientId: string) {
  const { data, error } = await client
    .from('patients')
    .select('*')
    .eq('id', patientId)
    .single();

  if (error) throw error;
  return data;
}

/**
 * 보호자의 연결된 환자 목록을 조회합니다.
 * guardian_patient_links 테이블을 통해 연결된 환자를 가져옵니다.
 * @param client Supabase 클라이언트
 * @param guardianId 보호자 ID (auth.uid)
 */
export async function getPatientsByGuardian(client: SupabaseClient, guardianId: string) {
  const { data, error } = await client
    .from('guardian_patient_links')
    .select(
      `
      id,
      relationship,
      is_primary,
      notification_mode,
      patient:patients (
        id,
        full_name,
        birth_date,
        gender,
        care_grade,
        mobility,
        primary_diagnosis,
        needed_services,
        status,
        address,
        created_at
      )
    `,
    )
    .eq('guardian_id', guardianId)
    .order('is_primary', { ascending: false });

  if (error) throw error;
  return data;
}

/**
 * 새 환자를 등록합니다.
 * 환자 레코드 생성 후 보호자-환자 연결도 함께 생성합니다.
 * @param client Supabase 클라이언트
 * @param patient 환자 정보
 * @param guardianId 보호자 ID
 * @param relationship 보호자-환자 관계 (예: '자녀', '배우자')
 */
export async function createPatient(
  client: SupabaseClient,
  patient: TablesInsert<'patients'>,
  guardianId: string,
  relationship: string,
) {
  // 환자 생성
  const { data: newPatient, error: patientError } = await client
    .from('patients')
    .insert(patient)
    .select()
    .single();

  if (patientError) throw patientError;

  // 보호자-환자 연결 생성
  const { error: linkError } = await client.from('guardian_patient_links').insert({
    guardian_id: guardianId,
    patient_id: newPatient.id,
    relationship,
    is_primary: true,
    notification_mode: 'all',
  });

  if (linkError) throw linkError;

  return newPatient;
}

/**
 * 환자 정보를 업데이트합니다.
 * @param client Supabase 클라이언트
 * @param patientId 환자 ID
 * @param updates 업데이트할 필드
 */
export async function updatePatient(
  client: SupabaseClient,
  patientId: string,
  updates: TablesUpdate<'patients'>,
) {
  const { data, error } = await client
    .from('patients')
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq('id', patientId)
    .select()
    .single();

  if (error) throw error;
  return data;
}
